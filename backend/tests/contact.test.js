process.env.JWT_SECRET = "test-secret-for-automated-tests-only";
const request = require("supertest");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const app = require("../src/app");
const Contact = require("../src/models/Contact");

const userId = () => new mongoose.Types.ObjectId().toString();

let ownerId;
let otherUserId;
let token;
let otherToken;

function createToken(id) {
  return jwt.sign(
    { id, role: "User" },
    process.env.JWT_SECRET
  );
}

async function createContact(data = {}, owner = ownerId) {
  return Contact.create({
    name: "Kabir Khan",
    email: "kabir@example.com",
    phone: "9876543210",
    company: "OpenAI",
    owner,
    ...data,
  });
}

beforeEach(() => {
  ownerId = userId();
  otherUserId = userId();
  token = createToken(ownerId);
  otherToken = createToken(otherUserId);
});

describe("Contact API authentication", () => {
  test("rejects requests without a token", async () => {
    const response = await request(app).get("/api/contacts");

    expect(response.status).toBe(401);
  });
});

describe("Create contacts", () => {
  test("creates a contact for the logged-in user", async () => {
    const response = await request(app)
      .post("/api/contacts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Kabir Khan",
        phone: "9876543210",
        email: "KABIR@example.com",
        company: "OpenAI",
        owner: otherUserId,
      });

    expect(response.status).toBe(201);
    expect(response.body.contact.owner).toBe(ownerId);
    expect(response.body.contact.email).toBe("kabir@example.com");
  });

  test.each([
    [{ phone: "9876543210" }],
    [{ name: "Kabir Khan" }],
    [{ name: "Kabir Khan", phone: "9876543210", email: "bad-email" }],
  ])("rejects invalid contact data: %j", async (body) => {
    const response = await request(app)
      .post("/api/contacts")
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    expect(response.status).toBe(400);
  });
});

describe("List, search, filter and pagination", () => {
  beforeEach(async () => {
    await createContact({
      name: "Aarav Sharma",
      email: "aarav@example.com",
      phone: "1111111111",
      company: "Google",
    });

    await createContact({
      name: "Meera Singh",
      email: "meera@example.com",
      phone: "2222222222",
      company: "Microsoft",
    });

    await createContact({
      name: "Rohan Verma",
      email: "rohan@example.com",
      phone: "3333333333",
      company: "Google",
    });

    await createContact({
      name: "Other User",
      email: "other@example.com",
      phone: "4444444444",
      company: "Google",
    }, otherUserId);
  });

  test.each([
    ["name", "Aarav"],
    ["email", "meera@example.com"],
    ["phone", "3333333333"],
    ["company", "Microsoft"],
  ])("searches by %s", async (field, value) => {
    const response = await request(app)
      .get(`/api/contacts?search=${encodeURIComponent(value)}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.contacts.length).toBe(1);
    expect(response.body.contacts[0].name).not.toBe("Other User");
  });

  test("filters by company without exposing other users' contacts", async () => {
    const response = await request(app)
      .get("/api/contacts?company=Google")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.contacts).toHaveLength(2);
    expect(response.body.contacts.every(c => c.company === "Google")).toBe(true);
  });

  test("combines search and company filters", async () => {
    const response = await request(app)
      .get("/api/contacts?search=Aarav&company=Google")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.contacts).toHaveLength(1);
    expect(response.body.contacts[0].name).toBe("Aarav Sharma");
  });

  test("sorts contacts by name ascending", async () => {
    const response = await request(app)
      .get("/api/contacts?sortBy=name&order=asc")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.contacts.map(c => c.name)).toEqual([
      "Aarav Sharma",
      "Meera Singh",
      "Rohan Verma",
    ]);
  });

  test("returns correct pagination metadata", async () => {
    const response = await request(app)
      .get("/api/contacts?page=2&limit=1&sortBy=name&order=asc")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.contacts).toHaveLength(1);
    expect(response.body.contacts[0].name).toBe("Meera Singh");
    expect(response.body.pagination).toEqual({
      total: 3,
      page: 2,
      limit: 1,
      totalPages: 3,
    });
  });

  test("returns an empty list when no contacts match", async () => {
    const response = await request(app)
      .get("/api/contacts?search=NoSuchContact123")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.contacts).toEqual([]);
    expect(response.body.pagination.total).toBe(0);
  });

  test.each([
    "sortBy=email",
    "order=sideways",
    "page=0",
    "page=abc",
    "limit=101",
  ])("rejects invalid query parameters: %s", async (query) => {
    const response = await request(app)
      .get(`/api/contacts?${query}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
  });
});

describe("Read, update and delete contacts", () => {
  test("gets a contact owned by the logged-in user", async () => {
    const contact = await createContact();

    const response = await request(app)
      .get(`/api/contacts/${contact._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("Kabir Khan");
  });

  test("does not allow reading another user's contact", async () => {
    const contact = await createContact({}, otherUserId);

    const response = await request(app)
      .get(`/api/contacts/${contact._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
  });

  test("rejects malformed contact IDs", async () => {
    const response = await request(app)
      .get("/api/contacts/not-an-id")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
  });

  test("updates an owned contact", async () => {
    const contact = await createContact();

    const response = await request(app)
      .put(`/api/contacts/${contact._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated Name" });

    expect(response.status).toBe(200);
    expect(response.body.contact.name).toBe("Updated Name");
  });

  test("rejects an invalid email during update", async () => {
    const contact = await createContact();

    const response = await request(app)
      .put(`/api/contacts/${contact._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "not-an-email" });

    expect(response.status).toBe(400);
  });

  test("does not update another user's contact", async () => {
    const contact = await createContact({}, otherUserId);

    const response = await request(app)
      .put(`/api/contacts/${contact._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Hijacked" });

    expect(response.status).toBe(404);
    const unchanged = await Contact.findById(contact._id);
    expect(unchanged.name).toBe("Kabir Khan");
  });

  test("deletes an owned contact", async () => {
    const contact = await createContact();

    const response = await request(app)
      .delete(`/api/contacts/${contact._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(await Contact.findById(contact._id)).toBeNull();
  });

  test("does not delete another user's contact", async () => {
    const contact = await createContact({}, otherUserId);

    const response = await request(app)
      .delete(`/api/contacts/${contact._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(await Contact.findById(contact._id)).not.toBeNull();
  });
});

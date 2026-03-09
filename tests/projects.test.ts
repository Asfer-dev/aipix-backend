// tests/projects.test.ts
import cors from "cors";
import express from "express";
import request from "supertest";
import projectRoutes from "../src/modules/projects/projects.routes";
import prisma from "../src/prisma";
import { cleanupDatabase, createTestUser, generateTestToken } from "./setup";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/projects", projectRoutes);

describe("Projects & Images Module", () => {
  let listerUser: any;
  let listerToken: string;

  beforeEach(async () => {
    await cleanupDatabase(prisma);
    listerUser = await createTestUser(prisma, "LISTER");
    listerToken = generateTestToken(listerUser.id);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // PROJ-001: Create new project
  it("PROJ-001: should create a new project", async () => {
    const res = await request(app)
      .post("/projects")
      .set("Authorization", `Bearer ${listerToken}`)
      .send({
        name: "Luxury Villa Shoot",
        clientName: "John Doe",
        notes: "High-end property in Malibu",
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.name).toBe("Luxury Villa Shoot");
    expect(res.body.data.userId).toBe(listerUser.id);
  });

  // PROJ-002: Get all user projects
  it("PROJ-002: should get all user projects", async () => {
    // Create test projects
    await prisma.project.createMany({
      data: [
        { name: "Project 1", userId: listerUser.id },
        { name: "Project 2", userId: listerUser.id },
      ],
    });

    const res = await request(app)
      .get("/projects")
      .set("Authorization", `Bearer ${listerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data).toHaveLength(2);
  });

  // PROJ-003: Get project by ID
  it("PROJ-003: should get project by ID", async () => {
    const project = await prisma.project.create({
      data: {
        name: "Test Project",
        userId: listerUser.id,
      },
    });

    const res = await request(app)
      .get(`/projects/${project.id}`)
      .set("Authorization", `Bearer ${listerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(project.id);
    expect(res.body.data.name).toBe("Test Project");
  });

  // PROJ-004: Update project
  it("PROJ-004: should update project details", async () => {
    const project = await prisma.project.create({
      data: {
        name: "Old Name",
        userId: listerUser.id,
      },
    });

    const res = await request(app)
      .patch(`/projects/${project.id}`)
      .set("Authorization", `Bearer ${listerToken}`)
      .send({
        name: "New Name Updated",
        notes: "Updated notes",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("New Name Updated");
    expect(res.body.data.notes).toBe("Updated notes");
  });

  // PROJ-005: Delete project
  it("PROJ-005: should delete a project", async () => {
    const project = await prisma.project.create({
      data: {
        name: "To Delete",
        userId: listerUser.id,
      },
    });

    const res = await request(app)
      .delete(`/projects/${project.id}`)
      .set("Authorization", `Bearer ${listerToken}`);

    expect(res.status).toBe(200);

    // Verify deletion
    const deleted = await prisma.project.findUnique({
      where: { id: project.id },
    });
    expect(deleted).toBeNull();
  });

  // PROJ-006: Cannot access other user's project
  it("PROJ-006: should reject access to other user's project", async () => {
    const otherUser = await createTestUser(prisma, "LISTER");
    const otherProject = await prisma.project.create({
      data: {
        name: "Other User Project",
        userId: otherUser.id,
      },
    });

    const res = await request(app)
      .get(`/projects/${otherProject.id}`)
      .set("Authorization", `Bearer ${listerToken}`);

    expect(res.status).toBe(403);
  });

  // IMG-001: Upload image to project
  it.skip("IMG-001: should upload image to S3 and link to project", async () => {
    // Requires multer setup and mock S3
  });

  // IMG-002: Upload multiple images
  it.skip("IMG-002: should upload multiple images at once", async () => {
    // Requires multer setup
  });

  // IMG-003: Get project images
  it("IMG-003: should get all images for a project", async () => {
    const project = await prisma.project.create({
      data: {
        name: "Image Test Project",
        userId: listerUser.id,
      },
    });

    // Add images
    await prisma.image.createMany({
      data: [
        { projectId: project.id, originalUrl: "https://s3.aws.com/img1.jpg" },
        { projectId: project.id, originalUrl: "https://s3.aws.com/img2.jpg" },
      ],
    });

    const res = await request(app)
      .get(`/projects/${project.id}/images`)
      .set("Authorization", `Bearer ${listerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  // IMG-004: Delete image
  it("IMG-004: should delete an image", async () => {
    const project = await prisma.project.create({
      data: {
        name: "Delete Image Project",
        userId: listerUser.id,
      },
    });

    const image = await prisma.image.create({
      data: {
        projectId: project.id,
        originalUrl: "https://s3.aws.com/todelete.jpg",
      },
    });

    const res = await request(app)
      .delete(`/projects/${project.id}/images/${image.id}`)
      .set("Authorization", `Bearer ${listerToken}`);

    expect(res.status).toBe(200);
  });

  // AD-001: Create ad copy for project
  it("AD-001: should create ad copy for project", async () => {
    const project = await prisma.project.create({
      data: {
        name: "Ad Test Project",
        userId: listerUser.id,
      },
    });

    const res = await request(app)
      .post(`/projects/${project.id}/ad-copies`)
      .set("Authorization", `Bearer ${listerToken}`)
      .send({
        channel: "FACEBOOK",
        title: "Stunning 4BR Villa in Malibu",
        description: "Luxury beachfront property with panoramic ocean views",
        keywords: "villa, luxury, beachfront, malibu",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.channel).toBe("FACEBOOK");
    expect(res.body.data.title).toContain("Malibu");
  });

  // AD-002: Get ad copies for project
  it("AD-002: should get all ad copies for project", async () => {
    const project = await prisma.project.create({
      data: {
        name: "Multi Ad Project",
        userId: listerUser.id,
      },
    });

    await prisma.projectAdCopy.createMany({
      data: [
        {
          projectId: project.id,
          createdById: listerUser.id,
          channel: "FACEBOOK",
          title: "Ad 1",
          description: "Description 1",
        },
        {
          projectId: project.id,
          createdById: listerUser.id,
          channel: "INSTAGRAM",
          title: "Ad 2",
          description: "Description 2",
        },
      ],
    });

    const res = await request(app)
      .get(`/projects/${project.id}/ad-copies`)
      .set("Authorization", `Bearer ${listerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  // AD-003: Update ad copy
  it("AD-003: should update ad copy", async () => {
    const project = await prisma.project.create({
      data: {
        name: "Update Ad Project",
        userId: listerUser.id,
      },
    });

    const adCopy = await prisma.projectAdCopy.create({
      data: {
        projectId: project.id,
        createdById: listerUser.id,
        channel: "INSTAGRAM",
        title: "Old Title",
        description: "Old Description",
      },
    });

    const res = await request(app)
      .patch(`/projects/${project.id}/ad-copies/${adCopy.id}`)
      .set("Authorization", `Bearer ${listerToken}`)
      .send({
        title: "New Title Updated",
        description: "New Description",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("New Title Updated");
  });

  // AD-004: Delete ad copy
  it("AD-004: should delete ad copy", async () => {
    const project = await prisma.project.create({
      data: {
        name: "Delete Ad Project",
        userId: listerUser.id,
      },
    });

    const adCopy = await prisma.projectAdCopy.create({
      data: {
        projectId: project.id,
        createdById: listerUser.id,
        channel: "LINKEDIN",
        title: "To Delete",
        description: "This will be deleted",
      },
    });

    const res = await request(app)
      .delete(`/projects/${project.id}/ad-copies/${adCopy.id}`)
      .set("Authorization", `Bearer ${listerToken}`);

    expect(res.status).toBe(200);
  });
});

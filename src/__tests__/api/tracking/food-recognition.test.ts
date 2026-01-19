import { NextRequest } from "next/server";
import { POST as uploadPOST } from "../../../app/api/tracking/photo/upload/route";
import { POST as recognizePOST } from "../../../app/api/tracking/recognize/route";
import { POST as correctPOST } from "../../../app/api/tracking/recognize/correct/route";

jest.mock("../../../lib/auth", () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: "user-1" } }),
}));

jest.mock("../../../lib/services/file-storage-service", () => ({
  FileStorageService: {
    validateFileType: jest.fn().mockReturnValue(true),
    validateFileSize: jest.fn().mockReturnValue(true),
    uploadFile: jest
      .fn()
      .mockResolvedValue({ url: "https://example.com/img.png" }),
  },
}));

const prismaMock = {
  familyMember: {
    findFirst: jest.fn(),
  },
  mealLog: {
    create: jest.fn(),
    update: jest.fn(),
  },
  mealLogFood: {
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  foodPhoto: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  food: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
};

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => prismaMock),
  MealType: {
    BREAKFAST: "BREAKFAST",
    LUNCH: "LUNCH",
    DINNER: "DINNER",
    SNACK: "SNACK",
  },
  RecognitionStatus: {
    PENDING: "PENDING",
  },
}));

describe("food recognition persistence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("persists upload metadata", async () => {
    prismaMock.familyMember.findFirst.mockResolvedValue({ id: "member-1" });
    prismaMock.mealLog.create.mockResolvedValue({ id: "meal-log-1" });
    prismaMock.foodPhoto.create.mockResolvedValue({ id: "photo-1" });

    const formData = new FormData();
    const file = new File(["dummy"], "meal.jpg", { type: "image/jpeg" });
    formData.set("image", file);
    formData.set("mealType", "LUNCH");

    const request = new NextRequest(
      "http://localhost:3000/api/tracking/photo/upload",
      {
        method: "POST",
        body: formData,
      },
    );

    const response = await uploadPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prismaMock.foodPhoto.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mealLogId: "meal-log-1",
          fileUrl: "https://example.com/img.png",
          fileName: "meal.jpg",
          fileSize: file.size,
        }),
      }),
    );
    expect(data.photoId).toBe("photo-1");
  });

  it("persists recognition result and updates meal log", async () => {
    prismaMock.foodPhoto.findUnique.mockResolvedValue({
      id: "photo-1",
      mealLogId: "meal-log-1",
    });
    prismaMock.foodPhoto.update.mockResolvedValue({});
    prismaMock.food.findMany.mockResolvedValue([
      {
        id: "food-1",
        name: "米饭",
        calories: 130,
        protein: 2,
        carbs: 28,
        fat: 0,
      },
    ]);
    prismaMock.food.findFirst.mockResolvedValue({
      id: "food-2",
      name: "鸡蛋",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/tracking/recognize",
      {
        method: "POST",
        body: JSON.stringify({ photoId: "photo-1" }),
      },
    );

    const response = await recognizePOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prismaMock.foodPhoto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "photo-1" },
        data: expect.objectContaining({
          recognitionStatus: "COMPLETED",
        }),
      }),
    );
    expect(prismaMock.mealLogFood.create).toHaveBeenCalled();
    expect(prismaMock.mealLog.update).toHaveBeenCalled();
    expect(data.foodId).toBe("food-1");
  });

  it("persists corrected recognition result", async () => {
    prismaMock.foodPhoto.findUnique.mockResolvedValue({
      id: "photo-1",
      mealLogId: "meal-log-1",
    });
    prismaMock.food.findUnique.mockResolvedValue({
      id: "food-1",
      name: "鸡蛋",
      calories: 130,
      protein: 12,
      carbs: 1,
      fat: 8,
      fiber: 0,
      sugar: 0,
      sodium: 0,
    });
    prismaMock.foodPhoto.update.mockResolvedValue({});

    const request = new NextRequest(
      "http://localhost:3000/api/tracking/recognize/correct",
      {
        method: "POST",
        body: JSON.stringify({
          photoId: "photo-1",
          foodId: "food-1",
          amount: 120,
        }),
      },
    );

    const response = await correctPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prismaMock.mealLogFood.create).toHaveBeenCalled();
    expect(prismaMock.foodPhoto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "photo-1" },
        data: expect.objectContaining({
          confidence: 1,
        }),
      }),
    );
    expect(data.success).toBe(true);
  });
});

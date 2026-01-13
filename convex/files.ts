import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Generate upload URL for file storage
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Save medical report metadata
 */
export const saveMedicalReport = mutation({
  args: {
    memberId: v.id("familyMembers"),
    fileId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    reportDate: v.optional(v.number()),
    institution: v.optional(v.string()),
    reportType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db.insert("medicalReports", {
      memberId: args.memberId,
      fileId: args.fileId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      ocrStatus: "PENDING",
      reportDate: args.reportDate,
      institution: args.institution,
      reportType: args.reportType,
      isCorrected: false,
    });
  },
});

/**
 * Get file URL
 */
export const getFileUrl = query({
  args: { fileId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.fileId);
  },
});

/**
 * Get medical reports for a member
 */
export const getMedicalReports = query({
  args: {
    memberId: v.id("familyMembers"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const reports = await ctx.db
      .query("medicalReports")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .order("desc")
      .take(args.limit ?? 50);

    // Get file URLs for each report
    const reportsWithUrls = await Promise.all(
      reports.map(async (report) => {
        const url = await ctx.storage.getUrl(report.fileId);
        return { ...report, fileUrl: url };
      })
    );

    return reportsWithUrls;
  },
});

/**
 * Get medical report by ID
 */
export const getMedicalReport = query({
  args: { id: v.id("medicalReports") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const report = await ctx.db.get(args.id);
    if (!report || report.deletedAt) return null;

    const fileUrl = await ctx.storage.getUrl(report.fileId);

    // Get indicators
    const indicators = await ctx.db
      .query("medicalIndicators")
      .withIndex("by_reportId", (q) => q.eq("reportId", args.id))
      .collect();

    return { ...report, fileUrl, indicators };
  },
});

/**
 * Update OCR status
 */
export const updateOcrStatus = mutation({
  args: {
    id: v.id("medicalReports"),
    status: v.union(
      v.literal("PENDING"),
      v.literal("PROCESSING"),
      v.literal("COMPLETED"),
      v.literal("FAILED")
    ),
    ocrText: v.optional(v.string()),
    ocrError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    await ctx.db.patch(args.id, {
      ocrStatus: args.status,
      ocrText: args.ocrText,
      ocrError: args.ocrError,
    });

    return args.id;
  },
});

/**
 * Add medical indicator
 */
export const addMedicalIndicator = mutation({
  args: {
    reportId: v.id("medicalReports"),
    indicatorType: v.string(),
    name: v.string(),
    value: v.float64(),
    unit: v.string(),
    referenceRange: v.optional(v.string()),
    isAbnormal: v.boolean(),
    status: v.union(
      v.literal("NORMAL"),
      v.literal("LOW"),
      v.literal("HIGH"),
      v.literal("CRITICAL")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db.insert("medicalIndicators", {
      reportId: args.reportId,
      indicatorType: args.indicatorType as "TOTAL_CHOLESTEROL" | "LDL_CHOLESTEROL" | "HDL_CHOLESTEROL" | "TRIGLYCERIDES" | "FASTING_GLUCOSE" | "POSTPRANDIAL_GLUCOSE" | "GLYCATED_HEMOGLOBIN" | "ALT" | "AST" | "TOTAL_BILIRUBIN" | "DIRECT_BILIRUBIN" | "ALP" | "CREATININE" | "UREA_NITROGEN" | "URIC_ACID" | "WHITE_BLOOD_CELL" | "RED_BLOOD_CELL" | "HEMOGLOBIN" | "PLATELET" | "OTHER",
      name: args.name,
      value: args.value,
      unit: args.unit,
      referenceRange: args.referenceRange,
      isAbnormal: args.isAbnormal,
      status: args.status,
      isCorrected: false,
    });
  },
});

/**
 * Correct medical indicator
 */
export const correctIndicator = mutation({
  args: {
    id: v.id("medicalIndicators"),
    value: v.float64(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const indicator = await ctx.db.get(args.id);
    if (!indicator) throw new Error("Indicator not found");

    await ctx.db.patch(args.id, {
      value: args.value,
      originalValue: indicator.value,
      isCorrected: true,
    });

    // Update report corrected status
    await ctx.db.patch(indicator.reportId, {
      isCorrected: true,
      correctedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Delete medical report (soft delete)
 */
export const deleteMedicalReport = mutation({
  args: { id: v.id("medicalReports") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    await ctx.db.patch(args.id, { deletedAt: Date.now() });
    return true;
  },
});

/**
 * Delete file from storage
 */
export const deleteFile = mutation({
  args: { fileId: v.id("_storage") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    await ctx.storage.delete(args.fileId);
    return true;
  },
});

/**
 * Save food photo
 */
export const saveFoodPhoto = mutation({
  args: {
    mealLogId: v.id("mealLogs"),
    fileId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db.insert("foodPhotos", {
      mealLogId: args.mealLogId,
      fileId: args.fileId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      recognitionStatus: "PENDING",
    });
  },
});

/**
 * Update food photo recognition
 */
export const updateFoodRecognition = mutation({
  args: {
    id: v.id("foodPhotos"),
    status: v.union(
      v.literal("PENDING"),
      v.literal("PROCESSING"),
      v.literal("COMPLETED"),
      v.literal("FAILED")
    ),
    result: v.optional(v.string()),
    confidence: v.optional(v.float64()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    await ctx.db.patch(args.id, {
      recognitionStatus: args.status,
      recognitionResult: args.result,
      confidence: args.confidence,
      recognitionError: args.error,
    });

    return args.id;
  },
});

/**
 * Get food photos for a meal log
 */
export const getFoodPhotos = query({
  args: { mealLogId: v.id("mealLogs") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const photos = await ctx.db
      .query("foodPhotos")
      .withIndex("by_mealLogId", (q) => q.eq("mealLogId", args.mealLogId))
      .collect();

    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        const url = await ctx.storage.getUrl(photo.fileId);
        return { ...photo, fileUrl: url };
      })
    );

    return photosWithUrls;
  },
});

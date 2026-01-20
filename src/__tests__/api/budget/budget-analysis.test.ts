import { NextRequest } from "next/server";
import { GET as analyzeGET } from "@/app/api/budget/analyze/route";
import { GET as historyGET } from "@/app/api/budget/spending-history/route";
import { spendingAnalyzer } from "@/lib/services/budget/spending-analyzer";
import { budgetRepository } from "@/lib/repositories/budget-repository-singleton";

type ListSpendingsResult = {
  items: Array<{ amount: number; category: string }>;
  total: number;
};

jest.mock("@/lib/services/budget/spending-analyzer", () => ({
  spendingAnalyzer: {
    analyzeSpending: jest.fn(),
  },
}));

jest.mock("@/lib/repositories/budget-repository-singleton", () => ({
  budgetRepository: {
    listSpendings: jest.fn(),
  },
}));

describe("/api/budget", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/budget/analyze", () => {
    it("should return 400 when memberId is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/budget/analyze");

      const response = await analyzeGET(request);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "缺少memberId参数" });
    });

    it("should return analysis with default period", async () => {
      (spendingAnalyzer.analyzeSpending as jest.Mock).mockResolvedValue({
        summary: { total: 120 },
      });

      const request = new NextRequest("http://localhost:3000/api/budget/analyze?memberId=member-1");

      const response = await analyzeGET(request);

      expect(response.status).toBe(200);
      expect(spendingAnalyzer.analyzeSpending).toHaveBeenCalledWith("member-1", "MONTHLY");
      expect(await response.json()).toEqual({ summary: { total: 120 } });
    });
  });

  describe("GET /api/budget/spending-history", () => {
    it("should return 400 when budgetId is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/budget/spending-history");

      const response = await historyGET(request);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "缺少budgetId参数" });
    });

    it("should return paginated history with statistics", async () => {
      const allSpendings: ListSpendingsResult = {
        items: [
          { amount: 10, category: "PROTEIN" },
          { amount: 20, category: "VEGETABLE" },
          { amount: 15, category: "PROTEIN" },
        ],
        total: 3,
      };

      const paginatedSpendings: ListSpendingsResult = {
        items: allSpendings.items.slice(0, 2),
        total: 3,
      };

      (budgetRepository.listSpendings as jest.Mock)
        .mockResolvedValueOnce(allSpendings)
        .mockResolvedValueOnce(paginatedSpendings);

      const request = new NextRequest(
        "http://localhost:3000/api/budget/spending-history?budgetId=budget-1&page=1&limit=2"
      );

      const response = await historyGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(budgetRepository.listSpendings).toHaveBeenCalledTimes(2);
      expect(data.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
      expect(data.statistics.totalAmount).toBe(45);
      expect(data.statistics.totalTransactions).toBe(3);
      expect(data.statistics.averageAmount).toBe(15);
      expect(data.statistics.categoryBreakdown).toEqual(
        expect.arrayContaining([
          { category: "PROTEIN", amount: 25, count: 2 },
          { category: "VEGETABLE", amount: 20, count: 1 },
        ])
      );
    });
  });
});

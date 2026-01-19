import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { HealthReportViewer } from "../../../components/advisor/HealthReportViewer";

const mockHtml2Canvas = jest.fn();

jest.mock("html2canvas", () => ({
  __esModule: true,
  default: (element: HTMLElement) => mockHtml2Canvas(element),
}));

describe("HealthReportViewer", () => {
  const report = {
    id: "report-1",
    title: "周健康报告",
    summary: "本周整体健康状况良好。",
    htmlContent: "<html><body>report</body></html>",
    sections: [
      {
        id: "section-1",
        title: "总体表现",
        content: "内容",
        priority: "high" as const,
      },
    ],
    insights: ["建议多喝水"],
    recommendations: ["保持运动"],
    charts: [
      {
        id: "chart-1",
        type: "line" as const,
        title: "体重趋势",
        data: [
          { name: "周一", value: 60 },
          { name: "周二", value: 59 },
        ],
      },
    ],
    generatedAt: new Date("2025-01-01T10:00:00Z"),
    status: "completed" as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reports: [report] }),
    }) as jest.Mock;
    window.alert = jest.fn();
  });

  it("should render chart preview for selected report", async () => {
    render(<HealthReportViewer memberId="member-1" />);

    const reportCard = await screen.findByText("周健康报告");
    fireEvent.click(reportCard);

    await waitFor(() => {
      expect(screen.getByText("体重趋势")).toBeInTheDocument();
    });
  });

  it("should export PDF from report preview", async () => {
    const printWindow = {
      document: {
        write: jest.fn(),
        close: jest.fn(),
      },
      focus: jest.fn(),
      print: jest.fn(),
    } as unknown as Window;

    jest.spyOn(window, "open").mockReturnValue(printWindow);

    mockHtml2Canvas.mockResolvedValue({
      toDataURL: () => "data:image/png;base64,report",
    });

    render(<HealthReportViewer memberId="member-1" />);

    const reportCard = await screen.findByText("周健康报告");
    fireEvent.click(reportCard);

    const exportButton = await screen.findByText("导出PDF");
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockHtml2Canvas).toHaveBeenCalled();
      expect(window.open).toHaveBeenCalled();
    });
  });
});

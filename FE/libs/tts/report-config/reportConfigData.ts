export type ReportConfig = {
  id: number;
  nam: string;
  ten: string;
  ky: string;
  batDau: string;
  ketThuc: string;
  active: boolean;
};

export const REPORT_NAME_OPTIONS = ["Báo cáo tai nạn lao động", "Báo cáo TNLĐ"];
export const KY_OPTIONS = ["Cả năm", "6 tháng"];

export const INITIAL_REPORT_CONFIGS: ReportConfig[] = [
  { id: 1, nam: "2022", ten: "Báo cáo tai nạn lao động", ky: "Cả năm", batDau: "15/12/2023", ketThuc: "10/01/2024", active: true },
  { id: 2, nam: "2022", ten: "Báo cáo TNLĐ", ky: "6 tháng", batDau: "01/07/2022", ketThuc: "15/07/2022", active: true },
  { id: 3, nam: "2023", ten: "Báo cáo tai nạn lao động", ky: "Cả năm", batDau: "01/01/2024", ketThuc: "28/02/2024", active: false },
];

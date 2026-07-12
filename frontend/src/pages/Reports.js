import { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";
import { FileText, Download, Loader2, Sparkles, SlidersHorizontal, Table } from "lucide-react";

export default function Reports() {
  // AI report state
  const [type, setType] = useState("summary");
  const [period, setPeriod] = useState("Q4 2025");
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);

  // Custom report builder state
  const [deptFilter, setDeptFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [challengeFilter, setChallengeFilter] = useState("");
  const [customData, setCustomData] = useState(null);
  const [customBusy, setCustomBusy] = useState(false);

  // Options
  const [depts, setDepts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.get("/settings/departments").then((r) => setDepts(r.data)).catch(()=>{});
    api.get("/settings/categories").then((r) => setCategories(r.data)).catch(()=>{});
  }, []);

  const generate = async () => {
    setBusy(true); setReport(null);
    try {
      const { data } = await api.post("/ai/report", { report_type: type, period });
      setReport(data);
      toast.success("AI Report generated");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed to generate report");
    }
    setBusy(false);
  };

  const printReport = (reportElementId, reportTitle) => {
    const element = document.getElementById(reportElementId);
    if (!element) return;
    
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #111827;
              padding: 40px;
              margin: 0;
              background: #ffffff;
            }
            h1 { color: #166534; font-size: 24px; margin-bottom: 5px; }
            h2 { font-size: 18px; font-weight: 600; margin-top: 10px; margin-bottom: 20px; }
            .grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 16px;
              margin-bottom: 24px;
            }
            .border {
              border: 1px solid #E5E7EB;
              border-radius: 8px;
              padding: 16px;
            }
            .text-xs {
              font-size: 11px;
              text-transform: uppercase;
              color: #6B7280;
            }
            .text-2xl {
              font-size: 20px;
              font-weight: 700;
              margin-top: 4px;
            }
            .font-semibold {
              font-weight: 600;
            }
            ul {
              padding-left: 20px;
              margin-top: 8px;
            }
            li {
              margin-bottom: 6px;
              font-size: 13px;
              color: #374151;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
              margin-top: 10px;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #E5E7EB;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #F9FAFB;
              font-weight: 600;
            }
            .space-y-6 > * + * {
              margin-top: 24px;
            }
            .space-y-2 > * + * {
              margin-top: 8px;
            }
            .pill {
              font-size: 10px;
              padding: 2px 8px;
              border-radius: 9999px;
              background: #F1F5F9;
              color: #475569;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div style="margin-bottom: 20px; text-align: center; border-bottom: 2px solid #166534; padding-bottom: 10px;">
            <h1>EcoSphere Sustainability Platform</h1>
            <p style="margin: 0; color: #4B5563; font-size: 12px;">Enterprise ESG Verification & Reporting System</p>
          </div>
          ${element.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const downloadJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ecosphere-${type}-${period}.json`; a.click();
  };

  const exportAiReportCSV = () => {
    if (!report) return;
    let csvContent = "";
    csvContent += `Report Type,${type.toUpperCase()}\n`;
    csvContent += `Period,${period}\n`;
    csvContent += `Headline,"${report.headline}"\n\n`;
    
    csvContent += "Metric Label,Value,Trend\n";
    (report.key_metrics || []).forEach(m => {
      csvContent += `"${m.label}","${m.value}","${m.trend || ''}"\n`;
    });
    
    csvContent += "\nHighlights\n";
    (report.highlights || []).forEach(h => {
      csvContent += `"${h.replace(/"/g, '""')}"\n`;
    });
    
    csvContent += "\nRisks\n";
    (report.risks || []).forEach(r => {
      csvContent += `"${r.replace(/"/g, '""')}"\n`;
    });

    csvContent += "\nRecommendations,Why\n";
    (report.recommendations || []).forEach(rec => {
      csvContent += `"${rec.action.replace(/"/g, '""')}","${rec.why.replace(/"/g, '""')}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ecosphere-ai-report-${type}-${period}.csv`;
    a.click();
    toast.success("CSV file downloaded successfully!");
  };

  const exportAiReportPDF = () => {
    printReport("ai-report-content", `EcoSphere AI ESG Report - ${type} - ${period}`);
  };

  const runCustomQuery = async () => {
    setCustomBusy(true);
    try {
      const params = {};
      if (deptFilter) params.department = deptFilter;
      if (startDate) params.date_start = startDate;
      if (endDate) params.date_end = endDate;
      if (moduleFilter) params.module = moduleFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (employeeFilter) params.employee = employeeFilter;
      if (challengeFilter) params.challenge = challengeFilter;

      const { data } = await api.get("/reports/custom", { params });
      setCustomData(data);
      toast.success("Query results fetched!");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Query failed");
    }
    setCustomBusy(false);
  };

  const exportCustomCSV = () => {
    if (!customData) return;
    let csvContent = "Module,Identifier/Title,Department/Category,Date,Value/Metrics,Status\n";
    
    (customData.transactions || []).forEach(t => {
      csvContent += `"Environmental","${t.activity}","${t.department} / ${t.category}","${t.date}","${t.co2e_kg} kg CO2e","${t.evidence_url ? 'With Proof' : 'No Proof'}"\n`;
    });
    
    (customData.csr || []).forEach(c => {
      csvContent += `"Social","${c.title}","${c.department || 'All'} / ${c.category}","${c.date}","${c.hours} hrs (${c.xp_reward} XP)","${c.status}"\n`;
    });
    
    (customData.audits || []).forEach(a => {
      csvContent += `"Governance","${a.title}","${a.department} / Audit","${a.scheduled_date}","Score: ${a.score || 'Pending'}","${a.status}"\n`;
    });

    (customData.challenges || []).forEach(c => {
      csvContent += `"Gamification","${c.title}","Challenge / ${c.category}","${c.start_date} to ${c.end_date}","XP: ${c.xp_reward} / Coins: ${c.eco_coin_reward}","${c.status}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ecosphere_custom_report.csv";
    a.click();
    toast.success("CSV file downloaded successfully!");
  };

  const exportCustomExcel = () => {
    if (!customData) return;
    let excelContent = "Module\tIdentifier/Title\tDepartment/Category\tDate\tValue/Metrics\tStatus\n";
    
    (customData.transactions || []).forEach(t => {
      excelContent += `Environmental\t${t.activity}\t${t.department} / ${t.category}\t${t.date}\t${t.co2e_kg} kg CO2e\t${t.evidence_url ? 'With Proof' : 'No Proof'}\n`;
    });
    
    (customData.csr || []).forEach(c => {
      excelContent += `Social\t${c.title}\t${c.department || 'All'} / ${c.category}\t${c.date}\t${c.hours} hrs (${c.xp_reward} XP)\t${c.status}\n`;
    });
    
    (customData.audits || []).forEach(a => {
      excelContent += `Governance\t${a.title}\t${a.department} / Audit\t${a.scheduled_date}\tScore: ${a.score || 'Pending'}\t${a.status}\n`;
    });

    (customData.challenges || []).forEach(c => {
      excelContent += `Gamification\t${c.title}\tChallenge / ${c.category}\t${c.start_date} to ${c.end_date}\tXP: ${c.xp_reward} / Coins: ${c.eco_coin_reward}\t${c.status}\n`;
    });

    const blob = new Blob([excelContent], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ecosphere_custom_report.xls";
    a.click();
    toast.success("Excel file downloaded successfully!");
  };

  const exportCustomPDF = () => {
    printReport("custom-report-content", "EcoSphere Custom Query Report");
  };

  return (
    <div className="space-y-6 fade-in" data-testid="reports-page">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Reports & Builder</h1>
        <p className="text-sm text-slate-500 mt-1">AI-generated ESG reports aligned to GRI · SASB frameworks, or build your own custom query report.</p>
      </div>

      {/* AI ESG Generator */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-emerald-700" />
          <div className="font-heading text-lg font-semibold">AI ESG Report Generator</div>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-semibold uppercase text-slate-500">Report Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} data-testid="report-type-select">
              <option value="summary">ESG Executive Summary</option>
              <option value="environmental">Environmental Report</option>
              <option value="social">Social Report</option>
              <option value="governance">Governance Report</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-semibold uppercase text-slate-500">Period</label>
            <input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Q4 2025" />
          </div>
          <button onClick={generate} disabled={busy} className="btn-primary flex items-center gap-2" data-testid="generate-report-btn">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Generate
          </button>
        </div>
      </div>

      {report && !report.error && (
        <div className="card p-8" data-testid="report-output">
          <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-200">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-500 font-mono">EcoSphere · {type} · {period}</div>
              <h2 className="font-heading text-2xl font-semibold mt-2 max-w-2xl">{report.headline}</h2>
            </div>
            <div className="flex gap-2">
              <button onClick={downloadJson} className="btn-outline flex items-center gap-1.5" data-testid="download-json-btn">
                <Download size={14} /> Export JSON
              </button>
              <button onClick={exportAiReportCSV} className="btn-outline flex items-center gap-1.5" data-testid="download-csv-btn">
                <Download size={14} /> Export CSV
              </button>
              <button onClick={exportAiReportPDF} className="btn-outline flex items-center gap-1.5" data-testid="download-pdf-btn">
                <Download size={14} /> Export PDF
              </button>
            </div>
          </div>

          <div id="ai-report-content">
            {report.key_metrics?.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {report.key_metrics.map((m, i) => (
                  <div key={i} className="border border-slate-200 rounded-lg p-4">
                    <div className="text-xs uppercase text-slate-500">{m.label}</div>
                    <div className="font-heading text-2xl font-semibold mt-1">{m.value}</div>
                    {m.trend && <div className="text-xs text-emerald-700 mt-0.5">{m.trend}</div>}
                  </div>
                ))}
              </div>
            )}

            {report.highlights?.length > 0 && (
              <div className="mb-6">
                <div className="text-xs font-semibold uppercase text-slate-500 mb-2">Highlights</div>
                <ul className="list-disc list-inside space-y-1 text-slate-700 text-sm">
                  {report.highlights.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </div>
            )}

            {report.risks?.length > 0 && (
              <div className="mb-6">
                <div className="text-xs font-semibold uppercase text-slate-500 mb-2">Risks</div>
                <ul className="list-disc list-inside space-y-1 text-slate-700 text-sm">
                  {report.risks.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </div>
            )}
            
            {report.recommendations?.length > 0 && (
              <div className="mb-6">
                <div className="text-xs font-semibold uppercase text-slate-500 mb-2">Recommendations</div>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase">
                        <th className="p-2">Action</th>
                        <th className="p-2">Why / Context</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.recommendations.map((rec, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="p-2 font-sans font-semibold text-slate-800">{rec.action}</td>
                          <td className="p-2 text-slate-600">{rec.why}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {report.closing_note && (
              <div className="text-xs text-slate-500 italic mt-4 pt-4 border-t border-slate-100">
                {report.closing_note}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Report Builder */}
      <div className="card p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <SlidersHorizontal size={16} className="text-purple-700" />
          <div className="font-heading text-lg font-semibold">Custom Dynamic Report Builder</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Department</label>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} data-testid="custom-dept-select">
              <option value="">All Departments</option>
              {depts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Module</label>
            <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} data-testid="custom-module-select">
              <option value="">All Modules</option>
              <option value="environmental">Environmental</option>
              <option value="social">Social</option>
              <option value="governance">Governance</option>
              <option value="gamification">Gamification</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Category</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} data-testid="custom-cat-select">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Employee</label>
            <input value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} placeholder="Name / Email" data-testid="custom-employee-input" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Challenge</label>
            <input value={challengeFilter} onChange={(e) => setChallengeFilter(e.target.value)} placeholder="Title / ID" data-testid="custom-challenge-input" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full" />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={runCustomQuery} disabled={customBusy} className="btn-primary" data-testid="run-custom-btn">
            {customBusy ? "Querying..." : "Query Data"}
          </button>
          {customData && (
            <>
              <button onClick={exportCustomCSV} className="btn-outline flex items-center gap-1.5" data-testid="export-csv-btn">
                <Download size={14} /> Export CSV
              </button>
              <button onClick={exportCustomExcel} className="btn-outline flex items-center gap-1.5" data-testid="export-excel-btn">
                <Download size={14} /> Export Excel
              </button>
              <button onClick={exportCustomPDF} className="btn-outline flex items-center gap-1.5" data-testid="export-pdf-btn">
                <Download size={14} /> Export PDF
              </button>
            </>
          )}
        </div>

        {customData && (
          <div className="space-y-6 pt-4 border-t border-slate-100 fade-in" data-testid="custom-results" id="custom-report-content">
            {/* Environmental Results */}
            {customData.transactions?.length > 0 && (
              <div className="space-y-2">
                <div className="font-heading text-sm font-semibold text-slate-700 flex items-center gap-1.5"><Table size={14} /> Carbon Transactions ({customData.transactions.length})</div>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase">
                        <th className="p-2">Activity</th>
                        <th className="p-2">Department</th>
                        <th className="p-2">Category</th>
                        <th className="p-2">CO2 Emissions</th>
                        <th className="p-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {customData.transactions.map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2 font-sans font-medium text-slate-700">{t.activity}</td>
                          <td className="p-2">{t.department}</td>
                          <td className="p-2">{t.category}</td>
                          <td className="p-2 text-emerald-800 font-bold">{t.co2e_kg} kg</td>
                          <td className="p-2">{t.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Social Results */}
            {customData.csr?.length > 0 && (
              <div className="space-y-2">
                <div className="font-heading text-sm font-semibold text-slate-700 flex items-center gap-1.5"><Table size={14} /> CSR Activities ({customData.csr.length})</div>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase">
                        <th className="p-2">Title</th>
                        <th className="p-2">Category</th>
                        <th className="p-2">Hours</th>
                        <th className="p-2">XP Reward</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {customData.csr.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2 font-sans font-medium text-slate-700">{c.title}</td>
                          <td className="p-2">{c.category}</td>
                          <td className="p-2">{c.hours} hrs</td>
                          <td className="p-2 text-purple-700">+{c.xp_reward} XP</td>
                          <td className="p-2 font-sans uppercase">{c.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Audits Results */}
            {customData.audits?.length > 0 && (
              <div className="space-y-2">
                <div className="font-heading text-sm font-semibold text-slate-700 flex items-center gap-1.5"><Table size={14} /> Governance Audits ({customData.audits.length})</div>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase">
                        <th className="p-2">Audit Title</th>
                        <th className="p-2">Department</th>
                        <th className="p-2">Score</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {customData.audits.map((a, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2 font-sans font-medium text-slate-700">{a.title}</td>
                          <td className="p-2">{a.department}</td>
                          <td className="p-2 font-bold text-amber-800">{a.score || "—"}</td>
                          <td className="p-2 font-sans uppercase">{a.status}</td>
                          <td className="p-2">{a.scheduled_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Eye, EyeOff } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function CertificateEditor() {
  const [formData, setFormData] = useState({
    recipientName: "Recipient Name",
    degree: "Bachelor of Science (B.Sc.)",
    class: "Upper Credit",
    date: "24th January 2023",
    registrarName: "Dr. Registrar",
  });

  const [showPreview, setShowPreview] = useState(true);
  const certificateRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const downloadPDF = async () => {
    if (!certificateRef.current) return;

    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save("NOUN-Certificate.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
              NOUN Certificate Editor
            </h1>
          </div>
          <p className="text-slate-600 text-sm md:text-base">
            Edit all certificate fields and download as PDF. All text is fully editable while maintaining the original design.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Form Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6 border border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-green-600 rounded"></span>
                Edit Certificate
              </h2>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="recipientName" className="text-slate-700 font-medium text-sm">
                    Recipient Name
                  </Label>
                  <Input
                    id="recipientName"
                    value={formData.recipientName}
                    onChange={(e) =>
                      handleInputChange("recipientName", e.target.value)
                    }
                    className="mt-2 text-sm border-slate-300 focus:border-green-600 focus:ring-green-600"
                    placeholder="Enter recipient name"
                  />
                </div>

                <div>
                  <Label htmlFor="degree" className="text-slate-700 font-medium text-sm">
                    Degree
                  </Label>
                  <Input
                    id="degree"
                    value={formData.degree}
                    onChange={(e) => handleInputChange("degree", e.target.value)}
                    className="mt-2 text-sm border-slate-300 focus:border-green-600 focus:ring-green-600"
                    placeholder="Enter degree"
                  />
                </div>

                <div>
                  <Label htmlFor="class" className="text-slate-700 font-medium text-sm">
                    Class of Award
                  </Label>
                  <Input
                    id="class"
                    value={formData.class}
                    onChange={(e) => handleInputChange("class", e.target.value)}
                    className="mt-2 text-sm border-slate-300 focus:border-green-600 focus:ring-green-600"
                    placeholder="e.g., Upper Credit"
                  />
                </div>

                <div>
                  <Label htmlFor="date" className="text-slate-700 font-medium text-sm">
                    Date
                  </Label>
                  <Input
                    id="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange("date", e.target.value)}
                    className="mt-2 text-sm border-slate-300 focus:border-green-600 focus:ring-green-600"
                    placeholder="Enter date"
                  />
                </div>

                <div>
                  <Label htmlFor="registrarName" className="text-slate-700 font-medium text-sm">
                    Registrar Name
                  </Label>
                  <Input
                    id="registrarName"
                    value={formData.registrarName}
                    onChange={(e) =>
                      handleInputChange("registrarName", e.target.value)
                    }
                    className="mt-2 text-sm border-slate-300 focus:border-green-600 focus:ring-green-600"
                    placeholder="Enter registrar name"
                  />
                </div>

                <div className="pt-4 space-y-3 border-t border-slate-200">
                  <Button
                    onClick={() => setShowPreview(!showPreview)}
                    variant="outline"
                    className="w-full text-sm"
                  >
                    {showPreview ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Hide Preview
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Show Preview
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={downloadPDF}
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Certificate Preview */}
          {showPreview && (
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
                <div
                  ref={certificateRef}
                  className="w-full bg-white p-8 md:p-12"
                  style={{
                    aspectRatio: "1.4",
                    backgroundImage:
                      "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,245,250,0.5) 100%)",
                  }}
                >
                  {/* Certificate Content */}
                  <div className="h-full flex flex-col items-center justify-between text-center relative">
                    {/* Top Section - Logo and Title */}
                    <div className="flex flex-col items-center gap-3 md:gap-4">
                      <img
                        src="/noun-logo.png"
                        alt="NOUN Logo"
                        className="h-12 md:h-16 object-contain"
                      />
                      <div>
                        <h1 className="text-xl md:text-3xl font-bold text-slate-900 tracking-wide">
                          NATIONAL OPEN UNIVERSITY OF NIGERIA
                        </h1>
                        <p className="text-sm md:text-lg text-slate-600 mt-1 md:mt-2 font-medium">
                          This is to certify that
                        </p>
                      </div>
                    </div>

                    {/* Middle Section - Editable Fields */}
                    <div className="flex flex-col items-center gap-4 md:gap-6 my-6 md:my-8">
                      <div className="border-b-2 border-slate-400 px-6 md:px-8 py-1 md:py-2 w-full max-w-md">
                        <p className="text-lg md:text-2xl font-serif italic text-slate-900">
                          {formData.recipientName}
                        </p>
                      </div>

                      <p className="text-slate-700 font-medium max-w-2xl text-xs md:text-sm">
                        having satisfied university requirements and passed the
                        prescribed examinations is hereby awarded with
                      </p>

                      <div className="border-b-2 border-slate-400 px-6 md:px-8 py-1 md:py-2 w-full max-w-md">
                        <p className="text-base md:text-xl font-serif italic text-slate-900">
                          {formData.degree}
                        </p>
                      </div>

                      <p className="text-slate-700 font-medium text-xs md:text-sm">
                        with the class of
                      </p>

                      <div className="border-b-2 border-slate-400 px-6 md:px-8 py-1 md:py-2 w-full max-w-xs">
                        <p className="text-sm md:text-lg font-serif italic text-slate-900">
                          {formData.class}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Section - Date and Seal */}
                    <div className="flex items-end justify-between w-full px-4 md:px-0">
                      <div className="text-left text-xs md:text-sm">
                        <p className="text-slate-600 mb-1 md:mb-2">
                          Given this
                        </p>
                        <div className="border-b border-slate-400 w-16 md:w-20 mb-1" />
                        <p className="text-slate-600 text-xs md:text-sm">
                          {formData.date}
                        </p>
                      </div>

                      <img
                        src="/noun-seal.png"
                        alt="NOUN Seal"
                        className="h-16 md:h-24 object-contain"
                      />

                      <div className="text-right text-xs md:text-sm">
                        <p className="text-slate-600 mb-6 md:mb-8">Registrar</p>
                        <div className="border-b border-slate-400 w-24 md:w-32 mb-1" />
                        <p className="text-slate-600 text-xs md:text-sm">
                          {formData.registrarName}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">💡 Tip:</span> Edit any field on the left panel to update the certificate. The preview updates in real-time. Click "Download PDF" to save your certificate.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Loader2, UploadCloud, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function PublicOnboardingForm({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [files, setFiles] = useState<Record<string, File>>({});

  useEffect(() => {
    fetch(`/api/public/onboarding/${params.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setForm(data.form);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  const handleFieldChange = (id: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [id]: value }));
  };

  const handleFileChange = (id: string, file: File | null) => {
    if (file) {
      setFiles((prev) => ({ ...prev, [id]: file }));
    } else {
      const newFiles = { ...files };
      delete newFiles[id];
      setFiles(newFiles);
    }
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Basic validation
      for (const field of form.fields) {
        if (field.required && !formData[field.id] && !files[field.id]) {
          toast.error(`Please fill out required field: ${field.label}`);
          setSubmitting(false);
          return;
        }
      }

      let candidateName = "Unknown Candidate";
      let candidateEmail = "no-email@provided.com";

      for (const field of form.fields) {
        const label = field.label.toLowerCase();
        if (label.includes("name") && formData[field.id]) candidateName = formData[field.id];
        if (label.includes("email") && formData[field.id]) candidateEmail = formData[field.id];
      }

      // 1. Create the submission
      const subRes = await fetch(`/api/public/onboarding/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: formData, candidateName, candidateEmail }),
      });
      const subData = await subRes.json();

      if (!subData.success) throw new Error(subData.error);
      const submissionId = subData.submissionId;

      // 2. Upload files
      const fileKeys = Object.keys(files);
      for (const fieldId of fileKeys) {
        const file = files[fieldId];
        const fd = new FormData();
        const label = form.fields.find((f: any) => f.id === fieldId)?.label || "Document";
        fd.append("file", file, `${label} - ${file.name}`);
        fd.append("submissionId", submissionId);

        await fetch("/api/documents", {
          method: "POST",
          body: fd,
        });
      }

      setSuccess(true);
      toast.success("Submitted successfully!");
    } catch (error: any) {
      toast.error("Error submitting form: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>;
  if (!form) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-lg">Form not found or no longer available.</div>;

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Submitted Successfully</h2>
          <p className="text-slate-500">Thank you for providing your details. HR will review your submission shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-blue-600 px-8 py-10 text-white">
          <h1 className="text-3xl font-bold mb-2">{form.title}</h1>
          {form.description && <p className="text-blue-100 text-lg">{form.description}</p>}
        </div>
        
        <form onSubmit={submitForm} className="p-8 space-y-6">
          {form.fields.map((field: any) => (
            <div key={field.id} className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              
              {field.type === "LONG_TEXT" ? (
                <textarea 
                  required={field.required}
                  onChange={e => handleFieldChange(field.id, e.target.value)}
                  className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
                  rows={4}
                />
              ) : field.type === "DROPDOWN" ? (
                <select 
                  required={field.required}
                  onChange={e => handleFieldChange(field.id, e.target.value)}
                  className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border bg-white"
                >
                  <option value="">Select option...</option>
                  {field.options?.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === "FILE_UPLOAD" ? (
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:border-blue-500 transition-colors bg-slate-50">
                  <div className="space-y-1 text-center flex flex-col items-center">
                    <UploadCloud className="mx-auto h-10 w-10 text-slate-400" />
                    <div className="flex text-sm text-slate-600 mt-2">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 px-2 py-1">
                        <span>Upload a file</span>
                        <input 
                          type="file" 
                          className="sr-only" 
                          required={field.required && !files[field.id]}
                          onChange={e => handleFileChange(field.id, e.target.files ? e.target.files[0] : null)}
                        />
                      </label>
                    </div>
                    {files[field.id] && (
                      <p className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full mt-2 inline-block">
                        {files[field.id].name} ({(files[field.id].size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                </div>
              ) : field.type === "DATE" ? (
                <input 
                  type="date"
                  required={field.required}
                  onChange={e => handleFieldChange(field.id, e.target.value)}
                  className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
                />
              ) : (
                <input 
                  type={field.type === "EMAIL" ? "email" : "text"}
                  required={field.required}
                  onChange={e => handleFieldChange(field.id, e.target.value)}
                  className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
                />
              )}
            </div>
          ))}

          <div className="pt-6 border-t border-slate-100">
            <button 
              type="submit" 
              disabled={submitting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 className="animate-spin mr-2" /> : null}
              {submitting ? "Submitting..." : "Submit Details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

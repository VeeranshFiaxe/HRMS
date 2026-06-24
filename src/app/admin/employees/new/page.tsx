// src/app/admin/employees/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

export default function NewEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
    employmentType: "FULL_TIME",
    department: "",
    designation: "",
    phone: "",
    joiningDate: new Date().toISOString().split("T")[0],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Employee created successfully");
        router.push("/admin/employees");
      } else {
        toast.error(data.error || "Failed to create employee");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="page-header">
        <Link href="/admin/employees" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft size={14} />
          Back to employees
        </Link>
        <h1 className="page-title">Add Employee</h1>
        <p className="page-subtitle">Create a new employee account</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Full Name *</label>
            <input name="name" required className="input" placeholder="Alice Johnson" value={form.name} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Email *</label>
            <input name="email" type="email" required className="input" placeholder="alice@company.com" value={form.email} onChange={handleChange} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Temporary Password *</label>
            <input name="password" type="password" required className="input" placeholder="Min. 8 characters" value={form.password} onChange={handleChange} minLength={8} />
          </div>
          <div>
            <label className="label">Role</label>
            <select name="role" className="input" value={form.role} onChange={handleChange}>
              <option value="EMPLOYEE">Employee</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Department</label>
            <input name="department" className="input" placeholder="Engineering" value={form.department} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Designation</label>
            <input name="designation" className="input" placeholder="Software Engineer" value={form.designation} onChange={handleChange} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Employment Type</label>
            <select name="employmentType" className="input" value={form.employmentType} onChange={handleChange}>
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="INTERN">Intern</option>
              <option value="CONTRACT">Contract</option>
            </select>
          </div>
          <div>
            <label className="label">Joining Date</label>
            <input name="joiningDate" type="date" className="input" value={form.joiningDate} onChange={handleChange} />
          </div>
        </div>

        <div>
          <label className="label">Phone</label>
          <input name="phone" className="input" placeholder="+91 9876543210" value={form.phone} onChange={handleChange} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : <><UserPlus size={16} /> Create Employee</>}
          </button>
          <Link href="/admin/employees" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

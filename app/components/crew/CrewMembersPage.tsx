"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CrewMember } from "@/app/actions/crew";

interface CrewMembersPageProps {
  initialCrewMembers: CrewMember[];
  createCrewMember: (formData: FormData) => Promise<{
    success?: boolean;
    error?: string;
  }>;
  updateCrewMember: (formData: FormData) => Promise<{
    success?: boolean;
    error?: string;
  }>;
  deleteCrewMember: (formData: FormData) => Promise<{
    success?: boolean;
    error?: string;
  }>;
}

export default function CrewMembersPage({
  initialCrewMembers,
  createCrewMember,
  updateCrewMember,
  deleteCrewMember,
}: CrewMembersPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [crewMembers, setCrewMembers] = useState(initialCrewMembers);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contact: "",
    role: "Own Crew" as "Own Crew" | "Freelancer",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formDataObj = new FormData();
    formDataObj.append("name", formData.name);
    formDataObj.append("email", formData.email);
    formDataObj.append("contact", formData.contact);
    formDataObj.append("role", formData.role);

    if (editingId) {
      formDataObj.append("id", editingId);
      const result = await updateCrewMember(formDataObj);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Crew member updated successfully");
        setEditingId(null);
        setShowAddForm(false);
        resetForm();
        startTransition(() => {
          router.refresh();
        });
      }
    } else {
      const result = await createCrewMember(formDataObj);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Crew member added successfully");
        setShowAddForm(false);
        resetForm();
        startTransition(() => {
          router.refresh();
        });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      contact: "",
      role: "Own Crew",
    });
    setError(null);
    setSuccess(null);
  };

  const handleEdit = (member: CrewMember) => {
    setFormData({
      name: member.name,
      email: member.email || "",
      contact: member.contact || "",
      role: member.role,
    });
    setEditingId(member.id);
    setShowAddForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) {
      return;
    }

    const formDataObj = new FormData();
    formDataObj.append("id", id);
    const result = await deleteCrewMember(formDataObj);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Crew member deleted successfully");
      startTransition(() => {
        router.refresh();
      });
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    resetForm();
  };

  // Update local state when initialCrewMembers changes (after refresh)
  useEffect(() => {
    setCrewMembers(initialCrewMembers);
  }, [initialCrewMembers]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Crew Members
            </h1>
            {!showAddForm && (
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setEditingId(null);
                  resetForm();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Add Crew Member
              </button>
            )}
          </div>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? "Edit Crew Member" : "Add New Crew Member"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="contact"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Contact
                  </label>
                  <input
                    type="text"
                    id="contact"
                    name="contact"
                    value={formData.contact}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="role"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Own Crew">Own Crew</option>
                    <option value="Freelancer">Freelancer</option>
                  </select>
                </div>
              </div>

              {(error || success) && (
                <div
                  className={`p-3 rounded-md ${
                    error
                      ? "bg-red-50 text-red-800 border border-red-200"
                      : "bg-green-50 text-green-800 border border-green-200"
                  }`}
                >
                  {error || success}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  {editingId ? "Update" : "Add"} Crew Member
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Crew Members Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[600px]">
              <thead className="bg-gray-50 border-b-2 border-gray-300">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                    Contact
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                    Role
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {crewMembers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 px-4 text-center text-gray-500"
                    >
                      No crew members found. Add your first crew member above.
                    </td>
                  </tr>
                ) : (
                  crewMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-gray-900 font-medium">
                        {member.name}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {member.email || "—"}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {member.contact || "—"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            member.role === "Own Crew"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {member.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(member)}
                            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(member.id, member.name)}
                            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        {crewMembers.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            Total: {crewMembers.length} crew member
            {crewMembers.length !== 1 ? "s" : ""} (
            {crewMembers.filter((m) => m.role === "Own Crew").length} Own Crew
            {crewMembers.filter((m) => m.role === "Own Crew").length !== 1
              ? "s"
              : ""}
            , {crewMembers.filter((m) => m.role === "Freelancer").length}{" "}
            Freelancer
            {crewMembers.filter((m) => m.role === "Freelancer").length !== 1
              ? "s"
              : ""}
            )
          </div>
        )}
      </div>
    </div>
  );
}


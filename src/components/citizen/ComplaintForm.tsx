'use client';

import React, { useState, useRef } from 'react';
import { WARDS, Ward, Complaint } from '@/types/database';
import {
  Sparkles,
  UploadCloud,
  X,
  CheckCircle2,
  AlertCircle,
  MapPin,
  FileText,
  Loader2,
  Tag,
  Building2,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react';

interface ComplaintFormProps {
  onComplaintCreated: (newComplaint: Complaint) => void;
}

export function ComplaintForm({ onComplaintCreated }: ComplaintFormProps) {
  const [title, setTitle] = useState('');
  const [ward, setWard] = useState<Ward>(WARDS[0]);
  const [address, setAddress] = useState('');
  const [citizenCategory, setCitizenCategory] = useState('');
  const [description, setDescription] = useState('');

  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);

  const SUPPORTED_INPUT_MIMES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ];

  const convertImageToJpeg = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas 2D context unavailable'));
            return;
          }

          ctx.drawImage(img, 0, 0);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Canvas blob generation failed'));
                return;
              }
              const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
              const convertedFile = new File([blob], cleanName, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(convertedFile);
            },
            'image/jpeg',
            0.85
          );
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Browser could not decode image'));
      };

      img.src = objectUrl;
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Photo exceeds the 5MB size limit. Please choose a smaller image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const fileType = file.type.toLowerCase().trim();
    let finalFile = file;

    // If MIME type is not supported, attempt canvas conversion to JPEG
    if (!SUPPORTED_INPUT_MIMES.includes(fileType)) {
      try {
        finalFile = await convertImageToJpeg(file);
      } catch {
        handleRemoveImage();
        setFormError('Unsupported image format. Please upload a JPG, PNG, or WebP photo.');
        return;
      }
    }

    setSelectedImage(finalFile);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(finalFile);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmittedComplaint(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('ward', ward);
      formData.append('address', address.trim());
      if (citizenCategory.trim()) {
        formData.append('citizen_category', citizenCategory.trim());
      }
      formData.append('description', description.trim());
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      const res = await fetch('/api/complaints', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to submit complaint');
      }

      const newComplaint: Complaint = data.complaint;
      setSubmittedComplaint(newComplaint);
      onComplaintCreated(newComplaint);

      // Reset form
      setTitle('');
      setWard(WARDS[0]);
      setAddress('');
      setCitizenCategory('');
      setDescription('');
      handleRemoveImage();
    } catch (err: any) {
      console.error('Complaint submission error:', err);
      setFormError(err?.message || 'An unexpected error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
            <FileText className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">File a Civic Grievance</h2>
        </div>
        <p className="text-xs text-slate-500">
          Report local issues in your neighborhood. Gemini AI will analyze your report, assign priority, and route it to the appropriate department.
        </p>
      </div>

      {/* Success Triage Banner */}
      {submittedComplaint && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <h3 className="text-sm font-bold text-emerald-950">
                Grievance Submitted & Triaged Successfully!
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSubmittedComplaint(null)}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200/60">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Ticket Code</span>
              <span className="font-mono font-bold text-emerald-900 text-sm">
                {submittedComplaint.ticket_code}
              </span>
            </div>

            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200/60">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Assigned Dept</span>
              <span className="font-semibold text-slate-900 truncate block" title={submittedComplaint.department}>
                {submittedComplaint.department}
              </span>
            </div>

            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200/60">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Priority</span>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${
                  submittedComplaint.priority === 'Critical'
                    ? 'bg-rose-100 text-rose-800'
                    : submittedComplaint.priority === 'High'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {submittedComplaint.priority}
              </span>
            </div>

            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200/60">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">AI Triage Status</span>
              <span
                className={`inline-flex items-center gap-1 font-semibold ${
                  submittedComplaint.ai_status === 'completed'
                    ? 'text-emerald-700'
                    : 'text-amber-700'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                {submittedComplaint.ai_status === 'completed' ? 'Automated' : 'Review Queued'}
              </span>
              {submittedComplaint.ai_model_used && (
                <span className="text-[10px] text-slate-500 block truncate mt-0.5" title={submittedComplaint.ai_model_used}>
                  via {submittedComplaint.ai_model_used}
                </span>
              )}
            </div>
          </div>

          {submittedComplaint.ai_summary && (
            <div className="text-xs text-slate-600 bg-white/70 p-2.5 rounded-xl border border-emerald-200/60">
              <span className="font-semibold text-slate-800">AI Assessment: </span>
              {submittedComplaint.ai_summary}
            </div>
          )}
        </div>
      )}

      {/* Error Alert */}
      {formError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-sm text-rose-800">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-950">Submission Error</p>
            <p className="text-xs mt-0.5">{formError}</p>
          </div>
          <button
            onClick={() => setFormError(null)}
            className="text-rose-700 hover:text-rose-900 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Issue Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Deep Pothole outside Greenfield Public School"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>

        {/* Ward & Category Hint */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Municipal Ward <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={ward}
                onChange={(e) => setWard(e.target.value as Ward)}
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {WARDS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category Hint (Optional)
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={citizenCategory}
                onChange={(e) => setCitizenCategory(e.target.value)}
                placeholder="e.g. Roads, Streetlight, Drainage"
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Exact Location / Street Address / Landmark <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Corner of 4th Cross Road, opposite Greenfield Public School, next to Central Bakery"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white whitespace-pre-wrap break-words"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Detailed Description <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue, hazard level, how long it has persisted, or immediate risks..."
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>

        {/* Photo Upload with Preview */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Attach Photo (Optional &middot; Max 5MB)
          </label>

          {imagePreview ? (
            <div className="relative w-full max-w-xs rounded-2xl overflow-hidden border border-slate-200 shadow-sm group">
              <img
                src={imagePreview}
                alt="Complaint Preview"
                className="w-full h-44 object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors shadow"
                title="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-0 inset-x-0 bg-slate-900/60 backdrop-blur-xs p-1.5 text-center text-[10px] text-white">
                Photo attached for AI verification
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <div className="p-2.5 rounded-full bg-slate-100 group-hover:bg-emerald-100 text-slate-500 group-hover:text-emerald-700 transition-colors">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700 group-hover:text-emerald-800">
                  Click to upload or drag photo here
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">JPEG, PNG, WebP up to 5MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-200 shadow-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Running Gemini AI Triage & Routing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>Submit Grievance with AI Triage</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

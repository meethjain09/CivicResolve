'use client';

import React, { useState, useRef } from 'react';
import { WARDS, Ward, Complaint } from '@/types/database';
import { PriorityBadge, AiStatusBadge } from '@/components/shared/StatusBadge';
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
  ShieldCheck,
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
    <div
      className="rounded-3xl border shadow-sm p-6 sm:p-7 space-y-6 transition-colors"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Header */}
      <div className="border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2.5 mb-1.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow-xs"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-fg)',
            }}
          >
            <FileText className="w-4 h-4" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Report a Civic Issue
          </h2>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Submit local hazards and complaints directly. Multimodal Gemini AI analyzes your report, verifies photo evidence, assigns priority, and routes it to the responsible department.
        </p>
      </div>

      {/* Post-Submission AI Triage Receipt */}
      {submittedComplaint && (
        <div
          className="p-4 sm:p-5 rounded-2xl border space-y-3.5 animate-in fade-in zoom-in-95"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-strong)',
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
              <h3 className="text-xs sm:text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                AI Triage Receipt Generated
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSubmittedComplaint(null)}
              className="text-xs font-semibold opacity-60 hover:opacity-100 p-1 cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
              title="Dismiss receipt"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Ticket Code */}
            <div
              className="p-2.5 rounded-xl border"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                Ticket Code
              </span>
              <span className="font-mono font-bold text-sm block mt-0.5" style={{ color: 'var(--accent)' }}>
                {submittedComplaint.ticket_code}
              </span>
            </div>

            {/* Assigned Department */}
            <div
              className="p-2.5 rounded-xl border"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                Assigned Dept
              </span>
              <span
                className="font-semibold text-xs truncate block mt-0.5"
                style={{ color: 'var(--text-primary)' }}
                title={submittedComplaint.department}
              >
                {submittedComplaint.department}
              </span>
            </div>

            {/* Priority */}
            <div
              className="p-2.5 rounded-xl border flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                Priority Level
              </span>
              <div className="mt-1">
                <PriorityBadge priority={submittedComplaint.priority} />
              </div>
            </div>

            {/* AI Status */}
            <div
              className="p-2.5 rounded-xl border flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                AI Triage
              </span>
              <div className="mt-1">
                <AiStatusBadge
                  status={submittedComplaint.ai_status}
                  modelUsed={submittedComplaint.ai_model_used}
                />
              </div>
            </div>
          </div>

          {/* AI Summary */}
          {submittedComplaint.ai_summary && (
            <div
              className="text-xs p-2.5 rounded-xl border italic"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <span className="font-semibold not-italic" style={{ color: 'var(--text-primary)' }}>
                AI Assessment:{' '}
              </span>
              &ldquo;{submittedComplaint.ai_summary}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Form Error Banner */}
      {formError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-600 dark:text-rose-400">Submission Alert</p>
            <p className="mt-0.5 opacity-90 leading-relaxed">{formError}</p>
          </div>
          <button
            type="button"
            onClick={() => setFormError(null)}
            className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-medium mb-1.5">
            Issue Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Deep Pothole outside Greenfield Public School"
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 transition-colors"
            style={{
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-strong)',
            }}
          />
        </div>

        {/* Ward & Category Hint */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-medium mb-1.5">
              Municipal Ward <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--text-muted)' }}
              />
              <select
                value={ward}
                onChange={(e) => setWard(e.target.value as Ward)}
                className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-strong)',
                }}
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
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-medium mb-1.5">
              Category Hint (Optional)
            </label>
            <div className="relative">
              <Tag
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                value={citizenCategory}
                onChange={(e) => setCitizenCategory(e.target.value)}
                placeholder="e.g. Roads, Drainage, Sanitation"
                className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 transition-colors"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-strong)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-medium mb-1.5">
            Exact Location / Street / Landmark <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Corner of 4th Cross Road, opposite Greenfield Public School, next to Central Bakery"
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 transition-colors whitespace-pre-wrap break-words"
            style={{
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-strong)',
            }}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-medium mb-1.5">
            Detailed Description <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue, hazard level, how long it has persisted, or immediate risks to public safety..."
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 transition-colors"
            style={{
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-strong)',
            }}
          />
        </div>

        {/* Photo Upload with Preview */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-medium mb-1.5">
            Attach Evidence Photo (Optional &bull; Max 5MB)
          </label>

          {imagePreview ? (
            <div
              className="relative w-full max-w-xs rounded-2xl overflow-hidden border shadow-sm group"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <img
                src={imagePreview}
                alt="Complaint Preview"
                className="w-full h-44 object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors shadow cursor-pointer"
                title="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-0 inset-x-0 bg-slate-900/70 backdrop-blur-xs p-1.5 text-center text-[10px] text-white font-mono">
                Photo ready for AI multimodal verification
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-elevated)',
              }}
            >
              <div
                className="p-2.5 rounded-full transition-colors"
                style={{
                  backgroundColor: 'var(--accent-soft)',
                  color: 'var(--accent)',
                }}
              >
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Click to upload or drag photo here
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  JPEG, PNG, WebP, HEIC up to 5MB
                </p>
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
            className="w-full py-3 px-6 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-95"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-fg)',
            }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running Gemini AI Triage & Routing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Submit Grievance with AI Triage</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

import React, { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Complaint } from '@/types/database';
import { AiStatusBadge } from '@/components/shared/StatusBadge';
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
  ArrowRight,
  ArrowLeft,
  Image as ImageIcon,
  Check,
  Send,
  Eye,
  RefreshCw,
} from 'lucide-react';

const LocationPicker = dynamic(() => import('./LocationPicker'), {
  ssr: false,
  loading: () => (
    <div
      className="p-6 rounded-2xl border flex items-center justify-center gap-2 text-xs"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-muted)',
      }}
    >
      <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
      <span>Loading interactive location picker...</span>
    </div>
  ),
});

interface ComplaintFormProps {
  onComplaintCreated: (newComplaint: Complaint) => void;
  onViewRequests?: () => void;
}

const CATEGORY_SUGGESTIONS = [
  { label: 'Road Damage', hint: 'Pothole, cracked asphalt, missing curb' },
  { label: 'Garbage Overflow', hint: 'Uncollected waste, illegal dump site' },
  { label: 'Streetlight Out', hint: 'Dark junction, flickering fixture' },
  { label: 'Water Leak', hint: 'Pipeline rupture, open drain spill' },
  { label: 'Park Safety', hint: 'Broken playground, fallen tree limb' },
];

export function ComplaintForm({ onComplaintCreated, onViewRequests }: ComplaintFormProps) {
  // Wizard Step: 1 = Issue, 2 = Location, 3 = Details & Photo, 4 = Review
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Fields
  const [title, setTitle] = useState('');
  const [citizenCategory, setCitizenCategory] = useState('');
  const [pincode, setPincode] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');

  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);

  // 3D Live Ticket Preview Tilt state
  const [previewRotate, setPreviewRotate] = useState({ x: 0, y: 0 });

  const handlePreviewMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget.getBoundingClientRect();
    const centerX = card.left + card.width / 2;
    const centerY = card.top + card.height / 2;
    const rotateY = ((e.clientX - centerX) / (card.width / 2)) * 6;
    const rotateX = -((e.clientY - centerY) / (card.height / 2)) * 6;
    setPreviewRotate({ x: rotateX, y: rotateY });
  };

  const handlePreviewMouseLeave = () => {
    setPreviewRotate({ x: 0, y: 0 });
  };

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

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Photo exceeds the 5MB size limit. Please choose a smaller image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const fileType = file.type.toLowerCase().trim();
    let finalFile = file;

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

  const handlePincodeChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 6);
    setPincode(cleaned);
  };

  // Step Navigations
  const handleNextFromStep1 = () => {
    if (!title.trim()) {
      setFormError('Please enter a descriptive issue title.');
      return;
    }
    setFormError(null);
    setCurrentStep(2);
  };

  const handleNextFromStep2 = () => {
    if (!pincode.trim() || !/^\d{6}$/.test(pincode.trim())) {
      setFormError('A valid 6-digit postal pincode is required (e.g. 560001).');
      return;
    }
    if (!address.trim()) {
      setFormError('Please provide a street address or map landmark.');
      return;
    }
    setFormError(null);
    setCurrentStep(3);
  };

  const handleNextFromStep3 = () => {
    if (!description.trim()) {
      setFormError('Please provide a detailed description of the civic hazard.');
      return;
    }
    setFormError(null);
    setCurrentStep(4);
  };

  const handleSubmit = async () => {
    setFormError(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('pincode', pincode.trim());
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
    } catch (err: any) {
      console.error('Complaint submission error:', err);
      setFormError(err?.message || 'An unexpected error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    setTitle('');
    setCitizenCategory('');
    setPincode('');
    setAddress('');
    setDescription('');
    handleRemoveImage();
    setSubmittedComplaint(null);
    setCurrentStep(1);
    setFormError(null);
  };

  // If successfully submitted, render confirmation receipt
  if (submittedComplaint) {
    return (
      <div
        className="rounded-3xl border p-8 sm:p-10 shadow-sm transition-all animate-in fade-in zoom-in-95 duration-200"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2
              className="text-2xl sm:text-3xl font-extrabold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Grievance Successfully Filed!
            </h2>
            <p
              className="text-xs sm:text-sm max-w-lg mx-auto leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              Your ticket has been officially registered with municipal services. Multimodal Gemini AI is
              classifying, prioritizing, and dispatching it in the background.
            </p>
          </div>

          {/* Ticket Receipt Box */}
          <div
            className="p-5 sm:p-6 rounded-2xl border text-left space-y-3 font-mono shadow-xs"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div>
                <span className="text-[11px] uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                  Tracking Code
                </span>
                <span className="text-xl font-extrabold font-mono" style={{ color: 'var(--accent)' }}>
                  {submittedComplaint.ticket_code}
                </span>
              </div>
              <AiStatusBadge status={submittedComplaint.ai_status} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>
                  Assigned Pincode
                </span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {submittedComplaint.pincode}
                </span>
              </div>
              <div>
                <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>
                  Target Department
                </span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {submittedComplaint.department || 'Routing in background...'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>
                  Grievance Title
                </span>
                <span className="font-sans font-semibold line-clamp-1" style={{ color: 'var(--text-primary)' }}>
                  {submittedComplaint.title}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {onViewRequests && (
              <button
                type="button"
                onClick={onViewRequests}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-fg)',
                }}
              >
                <span>View in My Requests</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleResetForAnother}
              className="w-full sm:w-auto px-5 py-3 rounded-xl font-semibold text-xs sm:text-sm border cursor-pointer transition-colors"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              Report Another Issue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: 4-Step Animated Wizard (7 cols) */}
      <div
        className="lg:col-span-7 rounded-3xl border shadow-sm p-6 sm:p-8 space-y-6 transition-colors"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* 3D Interactive Step Stepper */}
        <div className="space-y-3 pb-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-fg)',
                }}
              >
                {currentStep}
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Step {currentStep} of 4
              </span>
            </div>
            <span className="text-xs font-mono font-medium" style={{ color: 'var(--accent)' }}>
              {currentStep === 1 && 'Issue Category'}
              {currentStep === 2 && 'Location & Pincode'}
              {currentStep === 3 && 'Details & Proof'}
              {currentStep === 4 && 'Final Review'}
            </span>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((step) => {
              const isActive = currentStep === step;
              const isPast = currentStep > step;
              return (
                <div
                  key={step}
                  className="h-2 rounded-full transition-all duration-300 relative overflow-hidden"
                  style={{
                    backgroundColor: isPast || isActive ? 'var(--accent)' : 'var(--bg-elevated)',
                    opacity: isActive ? 1 : isPast ? 0.7 : 0.4,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Global Error Banner */}
        {formError && (
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* STEP 1: What's the Issue? */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
            <div>
              <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                What civic hazard are you reporting?
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Select a quick suggestion or describe the specific hazard in your own words.
              </p>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                Quick Suggestions
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_SUGGESTIONS.map((sug) => {
                  const isSelected = citizenCategory === sug.label;
                  return (
                    <button
                      key={sug.label}
                      type="button"
                      onClick={() => {
                        setCitizenCategory(sug.label);
                        if (!title) setTitle(`${sug.label}: `);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected ? 'shadow-xs scale-102' : 'hover:border-[var(--accent)]'
                      }`}
                      style={{
                        backgroundColor: isSelected ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                        borderColor: isSelected ? 'var(--accent)' : 'var(--border-subtle)',
                        color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                      }}
                    >
                      <Tag className="w-3 h-3" />
                      <span>{sug.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Issue Title Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                  Issue Title <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  {title.length} / 150
                </span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={150}
                placeholder="e.g. Major water pipeline rupture flooding arterial road"
                className="w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Citizen-Suggested Category */}
            <div className="space-y-2">
              <label className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                Citizen-Suggested Department / Category (Optional)
              </label>
              <input
                type="text"
                value={citizenCategory}
                onChange={(e) => setCitizenCategory(e.target.value)}
                maxLength={100}
                placeholder="e.g. Roads, Water Supply, Street Lighting"
                className="w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Step 1 Actions */}
            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={handleNextFromStep1}
                disabled={!title.trim()}
                className="px-6 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-fg)',
                }}
              >
                <span>Continue to Location</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Where is it? */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
            <div>
              <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Where is this hazard located?
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Pin on the map, use current GPS, or enter the street address and 6-digit postal pincode.
              </p>
            </div>

            {/* Interactive Location Picker */}
            <LocationPicker
              address={address}
              onAddressChange={setAddress}
              onPincodeDetected={(detected) => setPincode(detected)}
            />

            {/* Dedicated 6-Digit Pincode Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                  <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>6-Digit Postal Pincode</span>
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  {pincode.length} / 6 digits
                </span>
              </div>
              <input
                type="text"
                value={pincode}
                onChange={(e) => handlePincodeChange(e.target.value)}
                maxLength={6}
                placeholder="e.g. 560001 (auto-detected via GPS/Map or enter manually)"
                className="w-full px-4 py-3 rounded-xl border text-sm font-mono tracking-wider font-semibold transition-all focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Street Address / Landmark Text */}
            <div className="space-y-2">
              <label className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                Exact Street Address / Landmark <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                maxLength={300}
                rows={2}
                placeholder="e.g. Opposite City Hospital Gate 2, 4th Cross Road"
                className="w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none resize-none"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Step 2 Actions */}
            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 rounded-xl font-semibold text-xs border cursor-pointer transition-colors flex items-center gap-1.5"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleNextFromStep2}
                disabled={!address.trim() || !/^\d{6}$/.test(pincode.trim())}
                className="px-6 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-fg)',
                }}
              >
                <span>Continue to Details & Photo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Details & Photo Proof */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
            <div>
              <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Provide details and photo verification
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Our multimodal vision AI inspects photos to verify legitimate civic grievances.
              </p>
            </div>

            {/* Detailed Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                  Detailed Description <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  {description.length} / 2500
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2500}
                rows={4}
                placeholder="Describe how long the issue has existed, safety hazards, vehicle obstruction, or public risk..."
                className="w-full p-4 rounded-xl border text-sm transition-all focus:outline-none resize-none leading-relaxed"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Photo Upload Card */}
            <div className="space-y-2">
              <label className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                Photo Proof Attachment (Recommended)
              </label>

              {imagePreview ? (
                <div
                  className="relative rounded-2xl border p-4 flex items-center gap-4 shadow-xs"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <img
                    src={imagePreview}
                    alt="Upload Preview"
                    className="w-20 h-20 rounded-xl object-cover border"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold block truncate" style={{ color: 'var(--text-primary)' }}>
                      {selectedImage?.name || 'Photo attached'}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                      ✓ Validated image format
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-2 rounded-xl border hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer"
                    style={{ borderColor: 'var(--border-subtle)' }}
                    title="Remove photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer hover:border-[var(--accent)] transition-all flex flex-col items-center justify-center gap-2"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-strong)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center border"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--accent)',
                    }}
                  >
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block" style={{ color: 'var(--text-primary)' }}>
                      Click to upload photo evidence
                    </span>
                    <span className="text-[11px] mt-0.5 block" style={{ color: 'var(--text-muted)' }}>
                      JPG, PNG, WebP or HEIC up to 5MB
                    </span>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            {/* Step 3 Actions */}
            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2.5 rounded-xl font-semibold text-xs border cursor-pointer transition-colors flex items-center gap-1.5"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleNextFromStep3}
                disabled={!description.trim()}
                className="px-6 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-fg)',
                }}
              >
                <span>Continue to Review</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Review & Instant Submit */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
            <div>
              <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Review & Instant Submit
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Verify your report details before instantaneous submission.
              </p>
            </div>

            {/* Summary Review Card */}
            <div
              className="p-5 rounded-2xl border space-y-4 shadow-xs"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                  Issue Title
                </span>
                <span className="text-base font-bold block" style={{ color: 'var(--text-primary)' }}>
                  {title}
                </span>
                {citizenCategory && (
                  <span
                    className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium border"
                    style={{
                      backgroundColor: 'var(--accent-soft)',
                      color: 'var(--accent)',
                      borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
                    }}
                  >
                    Category: {citizenCategory}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                    Pincode
                  </span>
                  <span className="font-mono font-bold text-sm" style={{ color: 'var(--accent)' }}>
                    {pincode}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                    Photo Proof
                  </span>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {selectedImage ? '✓ 1 Image Attached' : 'No Photo Attached'}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                    Street Address
                  </span>
                  <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {address}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                    Description
                  </span>
                  <p className="font-normal text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--text-secondary)' }}>
                    {description}
                  </p>
                </div>
              </div>
            </div>

            {/* Instant Background AI Notice */}
            <div
              className="p-3.5 rounded-xl border flex items-center gap-2.5 text-xs"
              style={{
                backgroundColor: 'var(--accent-soft)',
                borderColor: 'color-mix(in srgb, var(--accent) 25%, transparent)',
                color: 'var(--text-secondary)',
              }}
            >
              <Sparkles className="w-4 h-4 shrink-0 text-[var(--accent)]" />
              <span>
                Submission is instantaneous. Multimodal Gemini AI will analyze severity, verify imagery, and route this ticket in the background.
              </span>
            </div>

            {/* Step 4 Actions */}
            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl font-semibold text-xs border cursor-pointer transition-colors flex items-center gap-1.5"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Edit Details</span>
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-7 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all shadow-sm disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-fg)',
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Grievance</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Interactive 3D Live Ticket Preview Card (5 cols) */}
      <div className="lg:col-span-5 sticky top-24 space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <Eye className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>3D Live Ticket Preview</span>
          </span>
          <span className="text-[11px] font-mono" style={{ color: 'var(--accent)' }}>
            Real-time mirror
          </span>
        </div>

        <div
          onMouseMove={handlePreviewMouseMove}
          onMouseLeave={handlePreviewMouseLeave}
          style={{ perspective: '1000px' }}
        >
          <div
            className="rounded-3xl border p-6 shadow-sm transition-transform duration-150 ease-out space-y-4"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
              transform: `rotateX(${previewRotate.x}deg) rotateY(${previewRotate.y}deg)`,
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Top Preview Badges */}
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg border bg-[var(--bg-elevated)] text-[var(--accent)] border-[var(--border-subtle)]">
                CR-PREVIEW
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                Draft
              </span>
            </div>

            {/* Title & Category */}
            <div className="space-y-1.5">
              <h3 className="text-base font-bold tracking-tight line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                {title.trim() || 'Your grievance title will appear here...'}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="px-2 py-0.5 rounded text-[11px] font-mono border"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {citizenCategory || 'General Civic'}
                </span>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border"
                  style={{
                    backgroundColor: 'var(--accent-soft)',
                    borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
                    color: 'var(--accent)',
                  }}
                >
                  <MapPin className="w-3 h-3" />
                  {pincode ? `PIN: ${pincode}` : 'Pincode: ------'}
                </span>
              </div>
            </div>

            {/* Address */}
            <div className="text-xs p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
              <span className="text-[10px] uppercase font-mono block tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Location
              </span>
              <span className="line-clamp-2 mt-0.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                {address.trim() || 'Location / Street address will appear here'}
              </span>
            </div>

            {/* Photo Preview in card */}
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border h-32" style={{ borderColor: 'var(--border-subtle)' }}>
                <img src={imagePreview} alt="Proof Preview" className="w-full h-full object-cover" />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono">
                  Attached Proof
                </span>
              </div>
            ) : (
              <div
                className="h-24 rounded-xl border border-dashed flex flex-col items-center justify-center gap-1 text-[11px]"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                <ImageIcon className="w-4 h-4 opacity-50" />
                <span>No photo evidence attached</span>
              </div>
            )}

            {/* AI Router Status Indicator */}
            <div
              className="p-3 rounded-xl border text-[11px] flex items-center justify-between font-mono"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Dispatch Routing:</span>
              <span className="font-bold flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                <Sparkles className="w-3 h-3" />
                <span>AI Background Triage</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

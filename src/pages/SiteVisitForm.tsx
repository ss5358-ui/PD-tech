import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { FileImage, Upload, X } from 'lucide-react';
import { useStore } from '../lib/store';

interface Asset {
  id: string;
  item: string;
}

interface SelectedAsset {
  assetId: string;
  quantity: number;
}

interface FormData {
  address: string;
  contactNo: string;
  notes: string;
  exitLocation: string;
  selectedAssets: SelectedAsset[];
  latitude: string;
  longitude: string;
  pdKitFile: File | null;
  pdKitEndFile: File | null;
}

export default function SiteVisitForm() {
  const { id: visitId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [error, setError] = useState("");
  const [pdKitUploading, setPdKitUploading] = useState(false);
  const [pdKitUploadError, setPdKitUploadError] = useState("");
  const [pdKitPreview, setPdKitPreview] = useState<string | null>(null);
  const [pdKitEndPreview, setPdKitEndPreview] = useState<string | null>(null);
  const [pdKitEndUploading, setPdKitEndUploading] = useState(false);
  const [pdKitEndUploadError, setPdKitEndUploadError] = useState("");
  const [pdKitEndUploadSuccess, setPdKitEndUploadSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [role] = useStore((state) => [state.role]);

  const [formData, setFormData] = useState<FormData>({
    address: "",
    contactNo: "",
    notes: "",
    exitLocation: "",
    selectedAssets: [],
    latitude: "",
    longitude: "",
    pdKitFile: null,
    pdKitEndFile: null
  });

  useEffect(() => {
    // Get current user session
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      } else {
        navigate('/login');
      }
    };

    fetchUser();
  }, [navigate]);

  useEffect(() => {
    async function fetchInitialData() {
      if (!user) return;
      
      setLoading(true);
      setError("");

      try {
        const { data: assetsData, error: assetsError } = await supabase
          .from("assets")
          .select("*")
          .order("item");

        if (assetsError) throw assetsError;
        setAssets(assetsData || []);

        if (visitId) {
          const { data: visitData, error: visitError } = await supabase
            .from("site_visit")
            .select("status, client_Id")
            .eq("id", visitId)
            .single();

          if (visitError) throw visitError;

          if (visitData.status === 'end') {
            navigate(`/site-visits/${visitId}`, { replace: true });
            return;
          }

          const { data: formData, error: formError } = await supabase
            .from("site_visit_form")
            .select("*")
            .eq("visit_id", visitId)
            .maybeSingle();

          if (formError) throw formError;

          if (formData) {
            setFormData({
              address: formData.address || "",
              contactNo: formData.contact_no || "",
              notes: formData.notes || "",
              exitLocation: formData.exit_location || "",
              selectedAssets: [],
              latitude: formData.latitude || "",
              longitude: formData.longitude || "",
              pdKitFile: null,
              pdKitEndFile: null
            });
          }

          const { data: assetsData, error: assetsError } = await supabase
            .from("site_visit_assets")
            .select("asset_id, quantity")
            .eq("site_visit_id", visitId);

          if (assetsError) throw assetsError;

          if (assetsData) {
            setFormData(prev => ({
              ...prev,
              selectedAssets: assetsData.map(item => ({
                assetId: item.asset_id,
                quantity: item.quantity
              }))
            }));
          }

          const { data: pdKitEndData, error: pdKitEndError } = await supabase
            .from("pd_kit_uploads")
            .select("file_path")
            .eq("visit_id", visitId)
            .eq("upload_type", "end")
            .maybeSingle();

          if (!pdKitEndError && pdKitEndData) {
            const { data } = supabase.storage.from('pd-kits').getPublicUrl(pdKitEndData.file_path);
            setPdKitEndPreview(data.publicUrl);
            setPdKitEndUploadSuccess(true);
          }
        }
      } catch (error: any) {
        console.error("Error loading data:", error);
        setError(error.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchInitialData();
  }, [visitId, navigate, user]);

  function updateFormData(updates: Partial<FormData>) {
    setFormData(prev => ({ ...prev, ...updates }));
  }

  const updateLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setIsGettingLocation(true);
    setLocationError("");

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
          }
        );
      });

      updateFormData({
        latitude: position.coords.latitude.toString(),
        longitude: position.coords.longitude.toString()
      });
    } catch (err: any) {
      console.error('Geolocation error:', err);
      setLocationError(err.message || "Failed to get location");
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handlePdKitEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      updateFormData({ pdKitEndFile: file });
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setPdKitEndPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      setPdKitEndUploadSuccess(false);
    }
  };

  const removePdKitEnd = () => {
    updateFormData({ pdKitEndFile: null });
    setPdKitEndPreview(null);
    setPdKitEndUploadError("");
    setPdKitEndUploadSuccess(false);
  };

  const uploadPdKitEnd = async () => {
    if (!user) {
      setPdKitEndUploadError('User not authenticated');
      return;
    }

    if (!formData.pdKitEndFile || !visitId) {
      setPdKitEndUploadError('Please select a file first');
      return;
    }

    setPdKitEndUploading(true);
    setPdKitEndUploadError("");

    try {
      // Get client ID from visit
      const { data: visitData, error: visitError } = await supabase
        .from('site_visit')
        .select('client_Id')
        .eq('id', visitId)
        .single();

      if (visitError) throw visitError;
      if (!visitData) throw new Error('Visit not found');

      // Generate unique filename
      const fileExt = formData.pdKitEndFile.name.split('.').pop();
      const fileName = `${user.id}-${visitId}-${Date.now()}.${fileExt}`;
      const filePath = `pd-kits/${fileName}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('pd-kits')
        .upload(filePath, formData.pdKitEndFile);

      if (uploadError) throw uploadError;

      // Delete previous PD Kit if exists
      if (pdKitEndPreview && pdKitEndPreview.includes('pd-kits/')) {
        const oldFilePath = pdKitEndPreview.split('pd-kits/')[1].split('?')[0];
        await supabase.storage.from('pd-kits').remove([oldFilePath]);
      }

      // Record in database
      const { error: dbError } = await supabase
        .from('pd_kit_uploads')
        .upsert({
          employee_id: user.id,
          client_id: visitData.client_Id,
          visit_id: visitId,
          file_path: filePath,
          upload_type: 'end'
        });

      if (dbError) throw dbError;

      // Update preview with the new uploaded file URL
      const { data } = supabase.storage.from('pd-kits').getPublicUrl(filePath);
      setPdKitEndPreview(data.publicUrl);
      setPdKitEndUploadSuccess(true);
    } catch (error: any) {
      console.error('Error uploading PD Kit:', error);
      setPdKitEndUploadError(error.message || 'Failed to upload PD Kit');
    } finally {
      setPdKitEndUploading(false);
    }
  };

  const validateStep = (currentStep: number) => {
    if (currentStep === 1 && !formData.notes) {
      setError("Please enter notes");
      return false;
    }
    if (currentStep === 2 && !formData.address) {
      setError("Please enter an address");
      return false;
    }
    if (currentStep === 3 && !formData.exitLocation) {
      setError("Please enter exit location");
      return false;
    }
    if (currentStep === 3 && (!formData.latitude || !formData.longitude)) {
      setError("Please update your location coordinates");
      return false;
    }
    setError("");
    return true;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep(3)) return;
    
    setLoading(true);
    setError("");

    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      let siteVisitId = visitId;

      if (!visitId) {
        const { data: newVisit, error: visitError } = await supabase
          .from("site_visit")
          .insert([
            {
              employee_id: user.id,
              status: "start",
              visit_date: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (visitError) throw visitError;
        siteVisitId = newVisit.id;
      }

      // Update status to "end" when completing the visit
      const { error: statusError } = await supabase
        .from("site_visit")
        .update({ status: "end" })
        .eq("id", siteVisitId!);

      if (statusError) throw statusError;

      // Save form data
      const { error: formError } = await supabase
        .from("site_visit_form")
        .upsert({
          id: visitId || undefined,
          visit_id: siteVisitId,
          address: formData.address,
          contact_no: formData.contactNo,
          notes: formData.notes,
          exit_location: formData.exitLocation,
          latitude: formData.latitude,
          longitude: formData.longitude,
        });

      if (formError) throw formError;

      // Save assets
      if (formData.selectedAssets.length > 0) {
        if (visitId) {
          const { error: deleteError } = await supabase
            .from("site_visit_assets")
            .delete()
            .eq("site_visit_id", siteVisitId);

          if (deleteError) throw deleteError;
        }

        const assetsToInsert = formData.selectedAssets.map(asset => ({
          site_visit_id: siteVisitId,
          asset_id: asset.assetId,
          quantity: Math.max(1, asset.quantity),
        }));

        const { error: assetsError } = await supabase
          .from("site_visit_assets")
          .insert(assetsToInsert);

        if (assetsError) throw assetsError;
      }

      // Upload PD Kit End if not already uploaded
      if (formData.pdKitEndFile && !pdKitEndUploadSuccess) {
        await uploadPdKitEnd();
      }

      localStorage.removeItem('draftSiteVisitForm');
      window.dispatchEvent(new CustomEvent('siteVisitUpdated', {
        detail: { visitId: siteVisitId }
      }));

      alert(`Site visit ${visitId ? "completed" : "created"} successfully!`);
      navigate("/site-visits", { replace: true });
    } catch (error: any) {
      console.error("Error saving site visit:", error);
      setError(error.message || "Failed to save site visit");
    } finally {
      setLoading(false);
    }
  }

  function renderStep1() {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-2">Notes *</label>
          <textarea
            value={formData.notes}
            onChange={(e) => updateFormData({ notes: e.target.value })}
            className="w-full p-2 border rounded h-32"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 mb-2">Contact No</label>
          <input
            type="text"
            value={formData.contactNo}
            onChange={(e) => updateFormData({ contactNo: e.target.value })}
            className="w-full p-2 border rounded"
          />
        </div>
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-2">Address *</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => updateFormData({ address: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div className="mt-6">
          <label className="block text-gray-700 mb-2 font-medium">Assets</label>
          <div className="space-y-3">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center gap-4 p-2 border rounded"
              >
                <input
                  type="checkbox"
                  id={`asset-${asset.id}`}
                  checked={formData.selectedAssets.some(
                    (a) => a.assetId === asset.id
                  )}
                  onChange={(e) => {
                    const newSelectedAssets = e.target.checked
                      ? [
                          ...formData.selectedAssets,
                          { assetId: asset.id, quantity: 1 },
                        ]
                      : formData.selectedAssets.filter(
                          (a) => a.assetId !== asset.id
                        );

                    updateFormData({ selectedAssets: newSelectedAssets });
                  }}
                  className="h-5 w-5"
                />
                <label htmlFor={`asset-${asset.id}`} className="flex-1">
                  {asset.item}
                </label>
                {formData.selectedAssets.some((a) => a.assetId === asset.id) && (
                  <input
                    type="number"
                    min="1"
                    value={
                      formData.selectedAssets.find((a) => a.assetId === asset.id)
                        ?.quantity || 1
                    }
                    onChange={(e) => {
                      const newSelectedAssets = formData.selectedAssets.map(
                        (a) =>
                          a.assetId === asset.id
                            ? {
                                ...a,
                                quantity: Math.max(1, parseInt(e.target.value) || 1),
                              }
                            : a
                      );
                      updateFormData({ selectedAssets: newSelectedAssets });
                    }}
                    className="w-20 p-1 border rounded"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderStep3() {
    return (
      <div className="space-y-6">
        <div>
          <label className="block text-gray-700 mb-2">Exit Location *</label>
          <input
            type="text"
            value={formData.exitLocation}
            onChange={(e) => updateFormData({ exitLocation: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        <div>
          <label className="block text-gray-700 mb-2">Location Coordinates *</label>
          <button
            type="button"
            onClick={updateLocation}
            disabled={isGettingLocation}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-400 flex items-center gap-2 mb-2"
          >
            {isGettingLocation ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Getting Location...
              </>
            ) : (
              'Update Current Location'
            )}
          </button>
          
          {locationError && (
            <p className="text-red-500 text-sm">{locationError}</p>
          )}
          
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <p className="text-sm font-medium">Latitude</p>
              <p className="text-sm text-gray-700 bg-gray-100 p-2 rounded">
                {formData.latitude || 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Longitude</p>
              <p className="text-sm text-gray-700 bg-gray-100 p-2 rounded">
                {formData.longitude || 'Not set'}
              </p>
            </div>
          </div>
        </div>

        {role === 'e.employee' && (
          <div>
            <label className="block text-gray-700 mb-2">PD Kit (End of Visit)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              {pdKitEndPreview ? (
          <div className="flex flex-col items-center">
            <div className="relative">
              <img 
                src={pdKitEndPreview} 
                alt="PD Kit End Preview" 
                className="max-h-48 mb-2 rounded"
              />
              <button
                type="button"
                onClick={removePdKitEnd}
                className="absolute top-0 right-0 bg-white rounded-full p-1 shadow"
              >
                <X className="w-4 h-4 text-red-500" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => document.getElementById('pd-kit-end-upload')?.click()}
              className="text-blue-600 hover:underline text-sm mb-2"
            >
              Change PD Kit
            </button>
            {!pdKitEndUploadSuccess && (
              <button
                type="button"
                onClick={uploadPdKitEnd}
                disabled={pdKitEndUploading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2"
              >
                {pdKitEndUploading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </>
                ) : (
            'Upload PD Kit'
                )}
              </button>
            )}
            {pdKitEndUploadSuccess && (
              <p className="text-green-600 text-sm mt-2">PD Kit uploaded successfully!</p>
            )}
          </div>
              ) : (
          <label htmlFor="pd-kit-end-upload" className="cursor-pointer">
            <div className="flex flex-col items-center justify-center space-y-2">
              <Upload className="w-8 h-8 text-gray-400" />
              <p className="text-sm text-gray-600">
                Click to upload PD Kit image
              </p>
              <p className="text-xs text-gray-500">
                (Optional for employees)
              </p>
            </div>
          </label>
              )}
              <input
          id="pd-kit-end-upload"
          type="file"
          accept="image/*"
          onChange={handlePdKitEndChange}
          className="hidden"
              />
            </div>
            {pdKitEndUploadError && (
              <p className="text-red-500 text-sm mt-2">{pdKitEndUploadError}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg mt-6">
      <h1 className="text-2xl font-bold mb-6">
        {visitId ? "Complete Site Visit" : "Create New Site Visit"}
      </h1>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between mb-2 text-sm font-medium">
          <span className={step === 1 ? "text-blue-600" : "text-gray-500"}>
            Step 1: Details
          </span>
          <span className={step === 2 ? "text-blue-600" : "text-gray-500"}>
            Step 2: Assets
          </span>
          <span className={step === 3 ? "text-blue-600" : "text-gray-500"}>
            Step 3: Completion
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${((step - 1) / 2) * 100}%` }}
          ></div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        <div className="flex justify-between pt-4 border-t">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              disabled={loading}
            >
              Back
            </button>
          ) : (
            <div></div>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (validateStep(step)) {
                  setStep(step + 1);
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={loading}
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              disabled={loading || pdKitEndUploading}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                visitId ? "Complete Visit" : "Create Visit"
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
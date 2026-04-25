import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';

const QUEUE_STATUS_OPTIONS = [
  { value: 'In waiting room', label: 'In waiting room' },
  { value: 'under treatment', label: 'Under treatment' },
  { value: 'Treatments are done / Done', label: 'Done' },
];

const QUEUE_READ_ROLES = ['ADMIN', 'ORTHODONTIST', 'DENTAL_SURGEON', 'NURSE', 'STUDENT', 'RECEPTION'];
const QUEUE_MUTATE_ROLES = ['ADMIN', 'ORTHODONTIST', 'DENTAL_SURGEON', 'RECEPTION'];

export function ClinicQueuePage() {
  const { user } = useAuth();
  const currentUserRole = user?.role?.toUpperCase() || '';
  const canReadQueue = QUEUE_READ_ROLES.includes(currentUserRole);
  const canAddPatient = QUEUE_MUTATE_ROLES.includes(currentUserRole);
  const canAutoStartTreatment = ['DENTAL_SURGEON', 'ORTHODONTIST'].includes(currentUserRole);

  const [queueData, setQueueData] = useState<any[]>([]);
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [stats, setStats] = useState({ inTreatment: 0, waiting: 0, done: 0, totalToday: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({ patient_id: '', status: 'In waiting room' });

  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canReadQueue) {
      setQueueData([]);
      setPatientsList([]);
      setStats({ inTreatment: 0, waiting: 0, done: 0, totalToday: 0 });
      setIsLoading(false);
      setError('You do not have access to the clinic queue.');
      return;
    }

    fetchClinicBoard();
    if (canAddPatient) {
      fetchPatientsList();
    } else {
      setPatientsList([]);
    }
    const interval = setInterval(fetchClinicBoard, 30000);
    return () => clearInterval(interval);
  }, [canAddPatient, canReadQueue, currentUserRole]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPatientsList = async () => {
    if (!canAddPatient) {
      setPatientsList([]);
      return;
    }

    try {
      const result = await apiService.queue.getAvailablePatients();
      if (result.success && Array.isArray(result.data)) setPatientsList(result.data);
      else setPatientsList([]);
    } catch (error) {
      setPatientsList([]);
    }
  };

  const fetchClinicBoard = async () => {
    try {
      setError(null);
      const result: any = await apiService.queue.getList();
      if (result.success) {
        setQueueData(Array.isArray(result.data) ? result.data : []);
        setStats({
          inTreatment: Number(result.stats?.inTreatment || 0),
          waiting: Number(result.stats?.waiting || 0),
          done: Number(result.stats?.done || 0),
          totalToday: Number(result.stats?.totalToday || 0)
        });
      }
    } catch (error: any) {
      console.error("Failed to fetch clinic board:", error);
      setQueueData([]);
      setError(error?.message || 'Failed to fetch clinic queue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.patient_id || !canAddPatient) return;

    try {
      const result = await apiService.queue.addToQueue(newPatient);
      if (result.success) {
        handleCloseModal();
        fetchClinicBoard();
        fetchPatientsList();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("Error registering patient:", error);
    }
  };

  const handleCloseModal = () => {
    setIsRegisterModalOpen(false);
    setNewPatient({ patient_id: '', status: 'In waiting room' });
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const updatePatientStatus = async (queueId: number, newStatus: string) => {
    try {
      const result = await apiService.queue.updateStatus(String(queueId), { status: newStatus });
      if (result.success) {
        fetchClinicBoard();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDoctorClick = (item: any) => {
    if (canAutoStartTreatment && item.status === 'In waiting room' && item.can_update) {
      updatePatientStatus(item.queue_id, 'under treatment');
    }
  };

  const filteredPatients = patientsList.filter(p => {
    const query = searchQuery.toLowerCase();
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    const code = (p.patient_code || '').toLowerCase();
    return fullName.includes(query) || code.includes(query);
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 font-medium text-slate-500">Loading Clinic Live...</div>;
  const isDoctor = canAutoStartTreatment;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Clinic Queue</h1>
        <p className="text-slate-500">Hospital Management System • {new Date().toLocaleDateString()}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'In Treatment', value: stats.inTreatment },
          { label: 'Waiting',      value: stats.waiting },
          { label: 'Done',         value: stats.done },
          { label: 'Total Today',  value: stats.totalToday },
        ].map(stat => (
          <div key={stat.label} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-3xl font-bold text-slate-800">{stat.value}</h3>
            <p className="text-slate-500 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Live Clinic Queue</h2>
          {canAddPatient && (
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + Add Patient
            </button>
          )}
        </div>

        {error && (
          <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {queueData.map((item: any) => (
            <div
              key={item.queue_id}
              onClick={() => handleDoctorClick(item)}
              className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 transition-colors 
                ${isDoctor && item.status === 'In waiting room' && item.can_update ? 'hover:bg-blue-50 cursor-pointer group' : 'hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-4 mb-4 sm:mb-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0
                  ${item.status === 'In waiting room' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-600'}`}>
                  {item.patient_name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    {item.patient_name}
                    {isDoctor && item.status === 'In waiting room' && item.can_update && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to start treatment
                      </span>
                    )}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mt-1">
                    <span>{new Date(item.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {item.student_name && <><span>•</span><span>Student: {item.student_name}</span></>}
                    {item.bay && <><span>•</span><span>Bay: {item.bay}</span></>}
                  </div>
                </div>
              </div>

              <div onClick={(e) => e.stopPropagation()}>
                <select
                  value={item.status}
                  onChange={(e) => updatePatientStatus(item.queue_id, e.target.value)}
                  className={`border-none rounded-full px-4 py-2 text-sm font-semibold outline-none ring-1 ring-inset 
                    ${item.status === 'In waiting room'           ? 'bg-yellow-50 text-yellow-700 ring-yellow-200' : ''}
                    ${item.status === 'under treatment'           ? 'bg-blue-50   text-blue-700   ring-blue-200'   : ''}
                    ${item.status === 'Treatments are done / Done'? 'bg-green-50  text-green-700  ring-green-200'  : ''}
                    ${item.can_update ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                  disabled={!item.can_update}
                >
                  {QUEUE_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
          {queueData.length === 0 && !error && <div className="p-8 text-center text-slate-500">No patients currently in the queue.</div>}
        </div>
      </div>

      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-xl font-bold text-gray-900">Add Patient to Queue</h3>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-10 w-10 border border-red-200 bg-red-50 text-red-600 hover:border-red-300 hover:bg-red-100 active:bg-red-200"
                onClick={handleCloseModal}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4 px-6 py-5">
              <div className="rounded-xl border border-green-100 bg-green-50/60 p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-gray-600">Patient</label>
                    <div className="relative" ref={dropdownRef}>
                      <input
                        type="text"
                        className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        placeholder="Search by name or ID..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setIsDropdownOpen(true);
                          setNewPatient(prev => ({ ...prev, patient_id: '' }));
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                      />

                      {isDropdownOpen && (
                        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                          {filteredPatients.length === 0 ? (
                            <div className="px-4 py-3 text-center text-sm text-gray-400">No patients found.</div>
                          ) : (
                            filteredPatients.map(p => (
                              <button
                                key={p.id}
                                type="button"
                                className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors hover:bg-blue-50"
                                onClick={() => {
                                  setNewPatient({ ...newPatient, patient_id: String(p.id) });
                                  setSearchQuery(`${p.first_name} ${p.last_name}`);
                                  setIsDropdownOpen(false);
                                }}
                              >
                                <span className="text-sm font-medium text-gray-900">{p.first_name} {p.last_name}</span>
                                {p.patient_code && <span className="text-xs font-medium text-gray-400">{p.patient_code}</span>}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-gray-600">Initial Status</label>
                    <select
                      className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      value={newPatient.status}
                      onChange={(e) => setNewPatient({ ...newPatient, status: e.target.value })}
                    >
                      {QUEUE_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newPatient.patient_id}>
                Add to Queue
              </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

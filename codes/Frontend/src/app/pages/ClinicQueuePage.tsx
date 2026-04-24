import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';

export function ClinicQueuePage() {
  const { user } = useAuth();
  
  // ✅ 100% accurate role extraction directly from the AuthContext
  const currentUserRole = user?.role?.toUpperCase() || (user as any)?.user?.role?.toUpperCase() || '';

  const [queueData, setQueueData] = useState<any[]>([]);
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [stats, setStats] = useState({ inTreatment: 0, waiting: 0, done: 0, totalToday: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({ patient_id: '', status: 'In waiting room' });

  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchClinicBoard();
    fetchPatientsList();
    const interval = setInterval(fetchClinicBoard, 30000);
    return () => clearInterval(interval);
  }, [currentUserRole]); // Reload if user role changes

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
    } catch (error) {
      console.error("Failed to fetch clinic board:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.patient_id) return; 

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
    const isDoctor = ['DENTAL_SURGEON', 'ORTHODONTIST'].includes(currentUserRole);
    if (isDoctor && item.status === 'In waiting room') {
      updatePatientStatus(item.queue_id, 'under consultation');
    }
  };

  const filteredPatients = patientsList.filter(p => {
    const query = searchQuery.toLowerCase();
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    const code = (p.patient_code || '').toLowerCase();
    return fullName.includes(query) || code.includes(query);
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 font-medium text-slate-500">Loading Clinic Live...</div>;

  // ✅ Proper button visibility logic
  const isDoctor = ['DENTAL_SURGEON', 'ORTHODONTIST'].includes(currentUserRole);
  const canAddPatient = ['RECEPTION', 'DENTAL_SURGEON', 'ORTHODONTIST', 'ADMIN'].includes(currentUserRole);
  const isStatusLocked = ['NURSE', 'STUDENT'].includes(currentUserRole);

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

        <div className="divide-y divide-slate-100">
          {queueData.map((item: any) => (
            <div
              key={item.queue_id}
              onClick={() => handleDoctorClick(item)}
              className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 transition-colors 
                ${isDoctor && item.status === 'In waiting room' ? 'hover:bg-blue-50 cursor-pointer group' : 'hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-4 mb-4 sm:mb-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0
                  ${item.status === 'In waiting room' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-600'}`}>
                  {item.patient_name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    {item.patient_name}
                    {isDoctor && item.status === 'In waiting room' && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to begin consultation
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
                    ${item.status === 'under consultation'        ? 'bg-purple-50 text-purple-700 ring-purple-200' : ''}
                    ${item.status === 'under treatment'           ? 'bg-blue-50   text-blue-700   ring-blue-200'   : ''}
                    ${item.status === 'Treatments are done / Done'? 'bg-green-50  text-green-700  ring-green-200'  : ''}
                    ${isStatusLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                  disabled={isStatusLocked}
                >
                  <option value="In waiting room">In waiting room</option>
                  <option value="under consultation">Under consultation</option>
                  <option value="under treatment">Under treatment</option>
                  {!isStatusLocked && (
                    <option value="Treatments are done / Done">Done</option>
                  )}
                </select>
              </div>
            </div>
          ))}
          {queueData.length === 0 && <div className="p-8 text-center text-slate-500">No patients currently in the queue.</div>}
        </div>
      </div>

      {isRegisterModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Add Patient to Queue</h2>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Patient</label>
                <div className="relative" ref={dropdownRef}>
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none text-sm"
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
                    <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                      {filteredPatients.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-400 text-center">No patients found.</div>
                      ) : (
                        filteredPatients.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors flex items-center justify-between gap-2"
                            onClick={() => {
                              setNewPatient({ ...newPatient, patient_id: String(p.id) });
                              setSearchQuery(`${p.first_name} ${p.last_name}`);
                              setIsDropdownOpen(false);
                            }}
                          >
                            <span className="text-sm font-medium text-slate-800">{p.first_name} {p.last_name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Initial Status</label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 bg-white text-sm"
                  value={newPatient.status}
                  onChange={(e) => setNewPatient({ ...newPatient, status: e.target.value })}
                >
                  <option value="In waiting room">In waiting room</option>
                  <option value="under consultation">Under consultation</option>
                  <option value="under treatment">Under treatment</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleCloseModal} className="flex-1 bg-slate-100 py-2.5 rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={!newPatient.patient_id} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm disabled:opacity-40">Add to Queue</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

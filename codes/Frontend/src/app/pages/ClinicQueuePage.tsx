import React, { useState, useEffect } from 'react';

export function ClinicQueuePage() {
  const [queueData, setQueueData] = useState([]);
  const [patientsList, setPatientsList] = useState<any[]>([]); 
  const [stats, setStats] = useState({ inTreatment: 0, waiting: 0, done: 0, totalToday: 0 });
  const [isLoading, setIsLoading] = useState(true);
  
  const [currentUserRole, setCurrentUserRole] = useState<string>('');

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    patient_id: '',
    student_id: '',
    status: 'In waiting room',
    bay: ''
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        try {
            const user = JSON.parse(storedUser);
            setCurrentUserRole(user.role || '');
        } catch (e) {
            console.error("Failed to parse user session");
        }
    }

    fetchClinicBoard();
    fetchPatientsList();
    
    const interval = setInterval(fetchClinicBoard, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPatientsList = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/queue/patients');
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        setPatientsList(result.data);
      } else {
        console.error("Backend sent invalid patient data:", result);
        setPatientsList([]); 
      }
    } catch (error) {
      console.error("Failed to fetch patients list. Is the backend router updated?", error);
      setPatientsList([]); 
    }
  };

  const fetchClinicBoard = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/queue');
      const result = await response.json();
      
      if (result.success) {
        setQueueData(result.data);
        setStats(result.stats);
      }
    } catch (error) {
      console.error("Failed to fetch clinic board:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3000/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatient)
      });
      
      const result = await response.json();
      if (result.success) {
        setIsRegisterModalOpen(false);
        setNewPatient({ patient_id: '', student_id: '', status: 'In waiting room', bay: '' });
        fetchClinicBoard(); 
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("Error registering patient:", error);
    }
  };

  const updatePatientStatus = async (queueId: number, newStatus: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/queue/${queueId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      const result = await response.json();
      if (result.success) {
        fetchClinicBoard(); 
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDoctorClick = (item: any) => {
    const isDoctor = currentUserRole === 'DENTAL_SURGEON' || currentUserRole === 'ORTHODONTIST';
    if (isDoctor && item.status === 'In waiting room') {
        updatePatientStatus(item.queue_id, 'under consultation');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 font-medium text-slate-500">Loading Clinic Live...</div>;
  }

  const isDoctor = currentUserRole === 'DENTAL_SURGEON' || currentUserRole === 'ORTHODONTIST';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Clinic Queue</h1>
        <p className="text-slate-500">Hospital Management System • {new Date().toLocaleDateString()}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-3xl font-bold text-slate-800">{stats.inTreatment}</h3>
            <p className="text-slate-500 font-medium">In Treatment</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-3xl font-bold text-slate-800">{stats.waiting}</h3>
            <p className="text-slate-500 font-medium">Waiting</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-3xl font-bold text-slate-800">{stats.done}</h3>
            <p className="text-slate-500 font-medium">Done</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-3xl font-bold text-slate-800">{stats.totalToday}</h3>
            <p className="text-slate-500 font-medium">Total Today</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Live Clinic Queue</h2>
          
          {!isDoctor && (
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
                  ${item.status === 'In waiting room' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-600'}
                `}>
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
                    <span>{new Date(item.arrival_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    {item.student_name && (
                      <>
                        <span>•</span>
                        <span>Student: {item.student_name}</span>
                      </>
                    )}
                    {item.bay && (
                      <>
                        <span>•</span>
                        <span>Bay: {item.bay}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div onClick={(e) => e.stopPropagation()}>
                <select 
                    value={item.status}
                    onChange={(e) => updatePatientStatus(item.queue_id, e.target.value)}
                    className={`border-none rounded-full px-4 py-2 text-sm font-semibold cursor-pointer outline-none ring-1 ring-inset 
                    ${item.status === 'In waiting room' ? 'bg-yellow-50 text-yellow-700 ring-yellow-200' : ''}
                    ${item.status === 'under consultation' ? 'bg-purple-50 text-purple-700 ring-purple-200' : ''}
                    ${item.status === 'under treatment' ? 'bg-blue-50 text-blue-700 ring-blue-200' : ''}
                    ${item.status === 'Treatments are done / Done' ? 'bg-green-50 text-green-700 ring-green-200' : ''}
                    `}
                >
                    <option value="In waiting room">In waiting room</option>
                    <option value="under consultation">under consultation</option>
                    <option value="under treatment">under treatment</option>
                    <option value="Treatments are done / Done">Treatments are done / Done</option>
                </select>
              </div>
            </div>
          ))}
          
          {queueData.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              No patients currently in the queue.
            </div>
          )}
        </div>
      </div>

      {isRegisterModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Add Patient to Queue</h2>
              <button onClick={() => setIsRegisterModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Select Patient</label>
                <select 
                  required
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={newPatient.patient_id}
                  onChange={(e) => setNewPatient({...newPatient, patient_id: e.target.value})}
                >
                  <option value="" disabled>-- Search & Select Patient --</option>
                  {patientsList.map(p => (
                    <option key={p.id} value={p.id}>
                       {p.first_name} {p.last_name} {p.patient_code ? `(${p.patient_code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Initial Status</label>
                <select 
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={newPatient.status}
                  onChange={(e) => setNewPatient({...newPatient, status: e.target.value})}
                >
                  <option value="In waiting room">In waiting room</option>
                  <option value="under consultation">under consultation</option>
                  <option value="under treatment">under treatment</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Student ID</label>
                  <input 
                    type="number" 
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newPatient.student_id}
                    onChange={(e) => setNewPatient({...newPatient, student_id: e.target.value})}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Bay</label>
                  <input 
                    type="text" 
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newPatient.bay}
                    onChange={(e) => setNewPatient({...newPatient, bay: e.target.value})}
                    placeholder="e.g. 1A"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="flex-1 bg-slate-100 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  disabled={!newPatient.patient_id}
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
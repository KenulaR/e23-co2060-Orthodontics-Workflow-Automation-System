import React, { useState, useEffect } from 'react';

export function ClinicQueuePage() {
  const [queueData, setQueueData] = useState<any[]>([]);
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
      } catch {
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
        setPatientsList([]);
      }
    } catch (error) {
      console.error("Failed to fetch patients list:", error);
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
      await fetch(`http://localhost:3000/api/queue/${queueId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      fetchClinicBoard();
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
    return <div className="flex items-center justify-center h-64">Loading Clinic Live...</div>;
  }

  const isDoctor = currentUserRole === 'DENTAL_SURGEON' || currentUserRole === 'ORTHODONTIST';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Clinic Queue</h1>

      {!isDoctor && (
        <button onClick={() => setIsRegisterModalOpen(true)}>
          + Add Patient
        </button>
      )}

      {queueData.map((item) => (
        <div key={item.queue_id} onClick={() => handleDoctorClick(item)}>
          {item.patient_name} - {item.status}
        </div>
      ))}

      {isRegisterModalOpen && (
        <form onSubmit={handleRegisterSubmit}>
          <select
            value={newPatient.patient_id}
            onChange={(e) => setNewPatient({ ...newPatient, patient_id: e.target.value })}
          >
            <option value="">Select Patient</option>
            {patientsList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.first_name} {p.last_name}
              </option>
            ))}
          </select>

          <button type="submit">Add</button>
        </form>
      )}
    </div>
  );
}
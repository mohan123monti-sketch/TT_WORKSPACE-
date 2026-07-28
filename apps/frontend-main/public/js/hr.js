async function loadHRData() {
    try {
        const user = auth.getUser();
        if (!user) return;

        // Load Leaves
        const leaves = await api.get('/hr/leaves');
        const leavesContainer = document.getElementById('leaves-list');
        
        if (leaves.length === 0) {
            leavesContainer.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px;">No leave requests found.</div>';
        } else {
            leavesContainer.innerHTML = leaves.map(l => `
                <div style="background:rgba(255,255,255,0.05); padding:12px; margin-bottom:10px; border-radius:8px; display:flex; justify-content:space-between;">
                    <div>
                        <div style="font-weight:bold;">${l.leave_type.toUpperCase()} (${l.start_date} to ${l.end_date})</div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">${l.user_name} • ${l.reason}</div>
                    </div>
                    <div>
                        <span class="badge badge-${l.status === 'approved' ? 'urgent' : l.status === 'rejected' ? 'danger' : 'normal'}">${l.status}</span>
                        ${['admin', 'team_leader'].includes(user.role) && l.status === 'pending' ? `
                            <button class="btn-primary" style="padding:4px 8px; font-size:0.7rem; margin-left:5px; background:var(--accent-green);" onclick="reviewLeave(${l.id}, 'approved')"><i class="fas fa-check"></i></button>
                            <button class="btn-primary" style="padding:4px 8px; font-size:0.7rem; margin-left:5px; background:var(--accent-orange);" onclick="reviewLeave(${l.id}, 'rejected')"><i class="fas fa-times"></i></button>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        }

        // Load Payroll
        const payroll = await api.get('/hr/payroll');
        const payrollContainer = document.getElementById('payroll-list');
        
        if (payroll.length === 0) {
            payrollContainer.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px;">No payroll slips generated.</div>';
        } else {
            payrollContainer.innerHTML = payroll.map(p => `
                <div style="background:rgba(255,255,255,0.05); padding:12px; margin-bottom:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:bold;">${p.month}/${p.year}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">${p.user_name}</div>
                    </div>
                    <div style="font-weight:bold; color:var(--accent-green);">
                        $${p.net_salary}
                    </div>
                </div>
            `).join('');
        }

    } catch (e) {
        console.error('Error loading HR data:', e);
    }
}

function openApplyLeaveModal() {
    document.getElementById('applyLeaveModal').style.display = 'flex';
}

async function submitLeave() {
    try {
        const body = {
            leave_type: document.getElementById('leaveType').value,
            start_date: document.getElementById('leaveStart').value,
            end_date: document.getElementById('leaveEnd').value,
            reason: document.getElementById('leaveReason').value
        };
        await api.post('/hr/leaves', body);
        ui.showToast('Leave applied successfully', 'success');
        document.getElementById('applyLeaveModal').style.display = 'none';
        loadHRData();
    } catch (e) {
        ui.showToast(e.message, 'error');
    }
}

async function reviewLeave(id, status) {
    try {
        await api.put(`/hr/leaves/${id}`, { status, admin_comment: 'Reviewed' });
        ui.showToast(`Leave ${status}`, 'success');
        loadHRData();
    } catch (e) {
        ui.showToast(e.message, 'error');
    }
}

// Add real-time listener for HR Updates
if (window.socket) {
    window.socket.on('hrUpdated', () => {
        console.log('[Socket] HR Data Updated');
        loadHRData();
    });
}

window.addEventListener('DOMContentLoaded', () => {
    loadHRData();
});

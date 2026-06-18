const API_BASE = '../backend';
let currentFieldId = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    fetchFields();

    // Setup image upload listener
    document.getElementById('imageInput').addEventListener('change', handleImageUpload);
});

// View Navigation
function showDashboard() {
    document.getElementById('view-field').classList.remove('active-view');
    document.getElementById('view-dashboard').classList.add('active-view');
    fetchFields(); // Refresh list
}

function goBack() {
    showDashboard();
}

function showFieldDetail(fieldId, fieldName) {
    currentFieldId = fieldId;
    document.getElementById('detail-field-name').innerText = fieldName;
    document.getElementById('view-dashboard').classList.remove('active-view');
    document.getElementById('view-field').classList.add('active-view');
    
    // Reset results UI
    document.getElementById('result-section').classList.add('hidden');
    
    fetchFieldStatus(fieldId);
}

// API Calls
async function fetchFields() {
    try {
        const response = await fetch(`${API_BASE}/get_fields.php`);
        const result = await response.json();
        
        const container = document.getElementById('field-list');
        container.innerHTML = ''; // clear loading
        
        if (result.status === 'success') {
            result.data.forEach(field => {
                const badgeClass = field.status === 'healthy' ? 'badge-healthy' : 
                                  (field.status === 'attention_needed' ? 'badge-attention' : 'badge-unknown');
                
                const cardHtml = `
                    <div class="glass-card field-card" onclick="showFieldDetail(${field.id}, '${field.name}')">
                        <div class="field-info">
                            <h3>${field.name}</h3>
                            <p><i class="fas fa-map-marker-alt"></i> ${field.location}</p>
                        </div>
                        <div class="badge ${badgeClass}">
                            ${field.status.replace('_', ' ')}
                        </div>
                    </div>
                `;
                container.innerHTML += cardHtml;
            });
        }
    } catch (e) {
        document.getElementById('field-list').innerHTML = `<p style="color:red; text-align:center;">Failed to connect to backend.</p>`;
    }
}

async function fetchFieldStatus(id) {
    const historyContainer = document.getElementById('scan-history');
    historyContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>';
    
    try {
        const response = await fetch(`${API_BASE}/get_field_status.php?field_id=${id}`);
        const result = await response.json();
        
        if (result.status === 'success') {
            const field = result.data;
            
            // Update status badge
            const statusBadge = document.getElementById('detail-field-status');
            statusBadge.innerText = field.status.replace('_', ' ').toUpperCase();
            statusBadge.className = 'badge ' + 
                (field.status === 'healthy' ? 'badge-healthy' : 
                (field.status === 'attention_needed' ? 'badge-attention' : 'badge-unknown'));
                
            // Update History
            historyContainer.innerHTML = '';
            if (field.recent_scans && field.recent_scans.length > 0) {
                field.recent_scans.forEach(scan => {
                    const date = new Date(scan.created_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
                    historyContainer.innerHTML += `
                        <div class="glass-card history-item">
                            <div class="history-date">${date}</div>
                            <div class="history-disease">${scan.result_disease} (${(scan.confidence*100).toFixed(0)}%)</div>
                        </div>
                    `;
                });
            } else {
                historyContainer.innerHTML = '<p style="text-align:center; color:#7f8c8d; font-size: 14px;">No scans yet.</p>';
            }
        }
    } catch (e) {
        historyContainer.innerHTML = '<p style="color:red; text-align:center;">Failed to fetch history.</p>';
    }
}

// Upload Handling
async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file || !currentFieldId) return;

    const formData = new FormData();
    formData.append('image', file);
    formData.append('field_id', currentFieldId);

    document.getElementById('upload-progress').classList.remove('hidden');
    document.getElementById('result-section').classList.add('hidden');

    try {
        const response = await fetch(`${API_BASE}/upload_image.php`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            // Show Results
            document.getElementById('result-section').classList.remove('hidden');
            document.getElementById('resStatus').innerText = result.data.field_status.replace('_', ' ').toUpperCase();
            document.getElementById('resDisease').innerText = result.data.disease;
            document.getElementById('resConfidence').innerText = `${(result.data.confidence * 100).toFixed(0)}%`;
            document.getElementById('resRecommendation').innerText = result.data.recommendation || "No action needed.";
            
            // Refresh to show new history & status
            fetchFieldStatus(currentFieldId);
        } else {
            alert('Analysis Error: ' + result.message);
        }
    } catch (e) {
        alert('Upload failed. Check your network or API Key.');
    } finally {
        document.getElementById('upload-progress').classList.add('hidden');
        // Clear input so same file can be selected again
        e.target.value = ''; 
    }
}

async function updateStatus() {
    try {
        const res = await fetch(`http://127.0.0.1:5000/status/FemboyCracky`);
        const data = await res.json();
        
        const statusElement = document.getElementById("status");
        statusElement.innerHTML = data.online ? 
            "I'm currently <span class='status-online'>Online</span>" : 
            "I'm currently <span class='status-offline'>Offline</span>";
            
        // Status-Klasse am Container setzen
        statusElement.className = `status ${data.online ? 'online' : 'offline'}`;
            
    } catch (err) {
        console.error('Status check failed:', err);
        const statusElement = document.getElementById("status");
        statusElement.innerHTML = "⚠️ <span class='status-error'>Error</span>";
        statusElement.className = 'status error';
    }
}

updateStatus();
setInterval(updateStatus, 5000);

document.getElementById('contactForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const form = e.target;
    const button = form.querySelector('button[type="submit"]');
    const originalButtonText = button.textContent;
    
    try {
        const formData = {
            name: form.name.value,
            email: form.email.value,
            message: form.message.value
        };
        
        button.disabled = true;
        button.textContent = 'Sending...';
        
        const response = await fetch('https://lenniapi.winniepat.de/submit-form', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Message sent successfully!');
            form.reset();
        } else {
            alert(`Error: ${data.error || 'Failed to send message'}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while sending the message. Please try again later.');
    } finally {
        button.disabled = false;
        button.textContent = originalButtonText;
    }
});


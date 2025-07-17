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
        
        const response = await fetch('http://localhost:5000/submit-form', {
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
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

// GitHub API Integration für Portfolio - Dynamic Repository Loading
const GITHUB_USERNAME = 'LenniLID';
const GITHUB_API_BASE = 'https://api.github.com';

// Repositories die ausgeschlossen werden sollen (optional)
const EXCLUDED_REPOS = [

];

// Alle Repositories vom User abrufen
async function fetchAllRepositories() {
    try {
        console.log('Fetching all repositories...');
        const response = await fetch(`${GITHUB_API_BASE}/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=100`);
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }
        
        const repos = await response.json();
        console.log(`Found ${repos.length} repositories`);
        
        // Filter forks und excluded repos
        const filteredRepos = repos.filter(repo => 
            !repo.fork && 
            !EXCLUDED_REPOS.includes(repo.name)
        );
        
        console.log(`Showing ${filteredRepos.length} repositories (excluding forks and excluded)`);
        return filteredRepos;
        
    } catch (error) {
        console.error('Error fetching repositories:', error);
        return [];
    }
}

// Commits für ein Repository abrufen
async function fetchCommitCount(repoName) {
    try {
        const response = await fetch(`${GITHUB_API_BASE}/repos/${GITHUB_USERNAME}/${repoName}/commits?per_page=1`);
        
        if (!response.ok) {
            console.warn(`Could not fetch commits for ${repoName}: ${response.status}`);
            return 0;
        }
        
        // Link header parsen für total count (approximation)
        const linkHeader = response.headers.get('Link');
        if (linkHeader) {
            const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
            if (lastPageMatch) {
                return parseInt(lastPageMatch[1]);
            }
        }
        
        // Fallback: Commits auf erster Seite zählen
        const commits = await response.json();
        return commits.length;
        
    } catch (error) {
        console.error(`Error fetching commits for ${repoName}:`, error);
        return 0;
    }
}

// Repository-Statistiken sammeln
async function getRepoStats(repo) {
    console.log(`Getting stats for ${repo.name}...`);
    
    const commits = await fetchCommitCount(repo.name);
    
    return {
        name: repo.name,
        description: repo.description || 'No description available',
        stars: repo.stargazers_count || 0,
        commits: commits,
        language: repo.language || 'N/A',
        url: repo.html_url,
        updated: repo.updated_at
    };
}

// Repository Card erstellen
function createRepoCard(stats) {
    const card = document.createElement('a');
    card.href = stats.url;
    card.className = 'project-card';
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    
    // Titel formatieren (repo-name -> Repo Name)
    const formattedTitle = stats.name
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    
    card.innerHTML = `
        <div class="description-title">${formattedTitle}</div>
        <div class="description">${stats.description}</div>
        <div class="repo-stats">
            <span class="stat-stars">⭐ ${stats.stars}</span>
            <span class="stat-commits">📝 ${stats.commits}</span>
            <span class="stat-language">🔧 ${stats.language}</span>
        </div>
    `;
    
    return card;
}

// Projects Container leeren und neu befüllen
function clearAndPopulateProjects(repoStats) {
    const projectsContainer = document.querySelector('.projects');
    
    if (!projectsContainer) {
        console.error('Projects container not found');
        return;
    }
    
    // Alle existierenden project-cards entfernen, aber andere Links behalten
    const existingCards = projectsContainer.querySelectorAll('.project-card');
    existingCards.forEach(card => card.remove());
    
    // Neue Repository-Cards hinzufügen
    repoStats.forEach(stats => {
        const card = createRepoCard(stats);
        projectsContainer.appendChild(card);
    });
    
}

// Loading-Anzeige für Projects Container
function showProjectsLoading() {
    const projectsContainer = document.querySelector('.projects');
    if (!projectsContainer) return;
    
    // Temporäre Loading-Card erstellen
    const loadingCard = document.createElement('div');
    loadingCard.className = 'project-card loading-placeholder';
    loadingCard.innerHTML = `
        <div class="description-title">Loading repositories...</div>
        <div class="description">Fetching data from GitHub API</div>
    `;
    loadingCard.style.cssText = 'opacity: 0.6; pointer-events: none;';
    
    projectsContainer.appendChild(loadingCard);
}

// Hauptfunktion - alle Repository-Stats laden
async function loadAllGitHubRepos() {
    console.log('Loading all GitHub repositories...');
    
    try {
        // Loading anzeigen
        showProjectsLoading();
        
        // Alle Repositories abrufen
        const allRepos = await fetchAllRepositories();
        
        if (allRepos.length === 0) {
            console.warn('No repositories found');
            return;
        }
        
        // Stats für alle Repositories sammeln
        const repoStatsPromises = allRepos.map(async (repo, index) => {
            // Kleine Verzögerung zwischen Requests um Rate Limits zu vermeiden
            await new Promise(resolve => setTimeout(resolve, index * 150));
            return getRepoStats(repo);
        });
        
        // Alle Stats parallel laden (mit Verzögerung)
        const allRepoStats = await Promise.all(repoStatsPromises);
        
        // Nach Stars sortieren (höchste zuerst)
        allRepoStats.sort((a, b) => b.stars - a.stars);
        
        // Projects Container aktualisieren
        clearAndPopulateProjects(allRepoStats);
        
        console.log(`Successfully loaded ${allRepoStats.length} repositories!`);
        
    } catch (error) {
        console.error('Error loading GitHub repositories:', error);
        
        // Fehler-Card anzeigen
        const projectsContainer = document.querySelector('.projects');
        if (projectsContainer) {
            const errorCard = document.createElement('div');
            errorCard.className = 'project-card';
            errorCard.innerHTML = `
                <div class="description-title">Error Loading Repos</div>
                <div class="description">Failed to fetch repositories from GitHub API</div>
                <div class="repo-stats">
                    <span class="stat-error">⚠️ API Error</span>
                </div>
            `;
            errorCard.style.cssText = 'border: 2px solid #ef4444; opacity: 0.8;';
            
            // Loading-Card ersetzen
            const loadingCard = projectsContainer.querySelector('.loading-placeholder');
            if (loadingCard) {
                projectsContainer.replaceChild(errorCard, loadingCard);
            } else {
                projectsContainer.appendChild(errorCard);
            }
        }
    }
}

// Status Update Funktion (existing)
async function updateStatus() {
    try {
        const res = await fetch(`http://127.0.0.1:5000/status/FemboyCracky`);
        const data = await res.json();
        
        const statusElement = document.getElementById("status");
        statusElement.className = "status-container fade-in"; // Nicht "container"
        statusElement.innerHTML = data.online ?
            "I'm currently <span style='color: #22c55e; font-weight: bold;'>Online</span>" :
            "I'm currently <span style='color: #ef4444; font-weight: bold;'>Offline</span>";
            
    } catch (err) {
        console.error('Status check failed:', err);
        const statusElement = document.getElementById("status");
        statusElement.className = "status-container fade-in";
        statusElement.innerHTML =
            "⚠️ <span style='color: #f59e0b; font-weight: bold;'>Error</span>";
    }
}

// Event Listeners und Initialisierung
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    
    // Alle GitHub Repositories laden
    loadAllGitHubRepos();
    
    // Status Updates starten (falls Element existiert)
    if (document.getElementById("status")) {
        updateStatus();
        setInterval(updateStatus, 500);
    }
});

// Debug-Funktionen für Konsole
window.debugGitHub = {
    fetchAllRepos: fetchAllRepositories,
    loadAllRepos: loadAllGitHubRepos,
    excludedRepos: EXCLUDED_REPOS
};

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


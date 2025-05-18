function slugify(text) {
    if (!text) return 'untitled-writeup';
    return text.toString().toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w-]+/g, '')        // Remove all non-word chars
        .replace(/--+/g, '-')           // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

function toggleFilter(label) {
    const input = label.querySelector('input');
    if (!input) { 
        const value = label.dataset.value;
        const correspondingInput = document.querySelector(`.filters input[value="${value}"]`);
        if (correspondingInput) {
            correspondingInput.checked = !correspondingInput.checked;
            label.classList.toggle('active', correspondingInput.checked);
        }
    } else {
        // Default label behavior should toggle the input.
        // Forcing checked state based on current state before toggle:
        const wasChecked = input.checked;
        input.checked = !wasChecked; 
        label.classList.toggle('active', input.checked);
    }
    filterSolves();
}


let solves = []; 

async function fetchSolves() {
    try {
        const response = await fetch('writeups.json'); 
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        solves = data;
        displaySolves();
        scrollToHashElement();
    } catch (error) {
        console.error("Could not fetch solves:", error);
        const container = document.getElementById('solves');
        if (container) {
            container.innerHTML = `<p style="color: #ffaaaa; text-align: center;">Error loading writeups. Please check the console for details.</p>`;
        }
    }
}

function displaySolves(filteredSolves = solves) {
    const container = document.getElementById('solves');
    if (!container) {
        console.error("Solve container not found");
        return;
    }
    container.innerHTML = '';
    if (filteredSolves.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #A47CFF; font-size: 1.2em; padding: 20px;">No writeups found matching your criteria.</p>`;
        return;
    }

    filteredSolves.forEach(solve => {
        const solveElement = document.createElement('div');
        solveElement.classList.add('solve');
        const solveSlug = slugify(solve.name);
        solveElement.id = `solve-${solveSlug}`;

        const description = solve.description ? solve.description.replace(/\n/g, "<br>") : 'No description provided.';
        
        let rawSolveSteps = solve.solve ? solve.solve : 'No solution steps provided.';
        let processedSolveSteps = '';

        const codeBlockPlaceholders = [];
        let placeholderIndex = 0;

        processedSolveSteps = rawSolveSteps.replace(/```(\w+)?\s*\n?([\s\S]*?)```/g, (match, lang, codeContent) => {
            const language = lang ? lang.trim().toLowerCase() : 'text';
            
            const escapedCode = codeContent
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

            const trimmedCodeContent = codeContent.trim();
            const lineCount = trimmedCodeContent === '' ? 1 : trimmedCodeContent.split('\n').length;
            const isSingleLine = lineCount <= 1;

            let preClasses = `language-${language}`;

            const wrapperClasses = `code-block-wrapper${isSingleLine ? ' single-line-code-wrapper' : ''}`;

            const codeBlockHtml = `<div class="${wrapperClasses}">
                                      <pre class="${preClasses.trim()}"><code class="language-${language}">${escapedCode}</code></pre>
                                      <button class="copy-code-btn" title="Copy code">
                                          <i class="fas fa-copy"></i> Copy
                                      </button>
                                  </div>`;
            codeBlockPlaceholders.push(codeBlockHtml);
            return `___CODE_BLOCK_PLACEHOLDER_${placeholderIndex++}___`;
        });

        processedSolveSteps = processedSolveSteps.replace(/\{([^{}]+\.(?:png|jpg|jpeg|gif))\}/gi, '<img src="images/$1" alt="$1" style="max-width:100%; border-radius: 5px; margin-top:10px; margin-bottom:10px;">');
        processedSolveSteps = processedSolveSteps.replace(/\n/g, "<br>");

        codeBlockPlaceholders.forEach((blockHtml, index) => {
            processedSolveSteps = processedSolveSteps.replace(`___CODE_BLOCK_PLACEHOLDER_${index}___`, blockHtml);
        });
        
        const permalinkAnchor = `<a href="#solve-${solveSlug}" class="permalink-icon" title="Permanent link to this writeup"><i class="fas fa-link"></i></a>`;

        solveElement.innerHTML = `
            <h2>${solve.name || 'Untitled Solve'} ${permalinkAnchor}</h2>
            <div class="solve-content">
                <p><strong>Author:</strong> ${solve.author || 'N/A'}</p>
                ${solve.link ? `<p><strong>Official link: </strong><a href="${solve.link}" target="_blank">Click here</a></p>` : ''}
                <p><strong>Description:</strong><br>${description}</p>
                <p><strong>Tools used:</strong> ${solve.tools || 'N/A'}</p>
                <p><strong>Tags:</strong> ${(solve.tags && solve.tags.length > 0) ? solve.tags.join(', ') : 'N/A'}</p>
                <p><strong>Solution:</strong></p>
                <div>${processedSolveSteps}</div> 
            </div>`;
        container.appendChild(solveElement);

        const copyButtons = solveElement.querySelectorAll('.copy-code-btn');
        copyButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const wrapper = btn.closest('.code-block-wrapper');
                const codeElement = wrapper.querySelector('pre code');
                const codeToCopy = codeElement.textContent;

                navigator.clipboard.writeText(codeToCopy).then(() => {
                    btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    btn.disabled = true;
                    setTimeout(() => {
                        btn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                        btn.disabled = false;
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy code: ', err);
                    btn.textContent = 'Error';
                     setTimeout(() => {
                        btn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                    }, 2000);
                });
            });
        });
    });

    if (typeof Prism !== 'undefined') {
        Prism.highlightAll();
    }
}

function filterSolves() {
    const searchInput = document.getElementById('search');
    if (!searchInput) return;

    const searchValue = searchInput.value.toLowerCase();
    const searchTerms = searchValue.split(',').map(term => term.trim()).filter(term => term !== "");
    
    const checkedLabels = Array.from(document.querySelectorAll('.filters label.active'));
    const checkedTags = checkedLabels.map(label => {
        const input = label.querySelector('input');
        return input ? input.value.toLowerCase() : label.dataset.value.toLowerCase();
    });
    
    const filteredSolves = solves.filter(solve => {
        const solveName = (solve.name || "").toLowerCase();
        const solveDescription = (solve.description || "").toLowerCase();
        const solveTools = (solve.tools || "").toLowerCase();
        const solveSolution = (solve.solve || "").toLowerCase();
        const solveTagsString = (solve.tags || []).join(' ').toLowerCase();

        const solveText = `${solveName} ${solveDescription} ${solveTools} ${solveSolution} ${solveTagsString}`;
        
        const matchesSearch = searchTerms.length === 0 || searchTerms.every(term => solveText.includes(term));
        
        const solveTagsLower = (solve.tags || []).map(t => t.toLowerCase());
        const matchesTags = checkedTags.length === 0 || checkedTags.every(ct => solveTagsLower.includes(ct));
        
        return matchesSearch && matchesTags;
    });
    
    displaySolves(filteredSolves);
}

function scrollToHashElement() {
    if (window.location.hash) {
        const elementId = window.location.hash.substring(1); 
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Highlight the element
            element.classList.add('highlighted-writeup');
            setTimeout(() => {
                element.classList.remove('highlighted-writeup');
            }, 3000); 
        }
    }
}

if (document.getElementById('solves')) { 
    fetchSolves();
}

// Ensure the active state of nav links is correctly set on writeups.html
document.addEventListener('DOMContentLoaded', () => {
    const currentLocation = window.location.href;
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.href === currentLocation || (currentLocation.includes(link.getAttribute('href')) && link.getAttribute('href') !== 'index.html') ) {
            link.classList.add('active');
        }
    });
    // If on writeups.html specifically, ensure 'Writeups' is active
    if (window.location.pathname.endsWith('writeups.html')) {
        document.querySelector('.nav-links a[href="writeups.html"]').classList.add('active');
        const homeLink = document.querySelector('.nav-links a[href="index.html"]');
        if (homeLink) homeLink.classList.remove('active');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Mobile Navigation Toggle
    const navToggle = document.querySelector('.nav-toggle');
    const navLinksList = document.getElementById('nav-links-list');

    if (navToggle && navLinksList) {
        navToggle.addEventListener('click', () => {
            navLinksList.classList.toggle('active');
            navToggle.classList.toggle('active'); // For animating the hamburger icon itself
            // Update aria-expanded attribute
            const isExpanded = navLinksList.classList.contains('active');
            navToggle.setAttribute('aria-expanded', isExpanded);
        });
    }

    // Current Year for Footer
    const currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // Active Navigation Link Highlighter
    const currentLocation = window.location.href.split('#')[0]; // Ignore hash
    const allNavLinks = document.querySelectorAll('.nav-links a');

    allNavLinks.forEach(link => link.classList.remove('active')); // Clear all first

    let bestMatch = null;
    allNavLinks.forEach(link => {
        // Check for exact match or if it's index.html for the root path
        if (link.href === currentLocation || (link.pathname.endsWith('index.html') && (currentLocation.endsWith('/') || currentLocation.endsWith('index.html')))) {
            bestMatch = link;
        }
        // Check for partial match if not index.html (for cases like /writeups.html being matched by /writeups)
        else if (link.getAttribute('href') !== 'index.html' && currentLocation.includes(link.getAttribute('href')) && link.getAttribute('href') !== '') {
                if (!bestMatch || (bestMatch.getAttribute('href') === 'index.html')) { // Prioritize more specific matches over index
                bestMatch = link;
            }
        }
    });

    if (bestMatch) {
        bestMatch.classList.add('active');
    } else { // Fallback for root if no other match and index.html is present
        const homeLink = document.querySelector('.nav-links a[href="index.html"]');
        if (homeLink && (currentLocation.endsWith('/') || currentLocation.endsWith('index.html'))) {
            homeLink.classList.add('active');
        }
    }
});
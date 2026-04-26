const toggle = document.querySelector('.nav-toggle');
const navUl = document.querySelector('nav ul');
 
if (toggle && navUl) {
    toggle.addEventListener('click', () => {
        navUl.classList.toggle('nav-open');
        const isOpen = navUl.classList.contains('nav-open');
        toggle.setAttribute('aria-expanded', isOpen);
    });
 
    // close nav when a link is clicked
    navUl.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navUl.classList.remove('nav-open');
            toggle.setAttribute('aria-expanded', false);
        });
    });
}

// loading project content (in seperate windows)
async function loadProjectContent(filePath) {
    const response = await fetch(filePath);

    return response.text();
}

function initializePhotographyCarousels(root) {
    if (!root || !root.querySelectorAll) return;

    const carousels = root.querySelectorAll('.photography-carousel');
    carousels.forEach((carousel) => {
        if (carousel.dataset.carouselReady === 'true') return;
        carousel.dataset.carouselReady = 'true';

        const slides = Array.from(carousel.querySelectorAll('.carousel-item'));
        if (slides.length === 0) return;

        let activeIndex = slides.findIndex((slide) => slide.classList.contains('active'));
        if (activeIndex < 0) activeIndex = 0;

        const showSlide = (nextIndex) => {
            slides[activeIndex].classList.remove('active');
            activeIndex = (nextIndex + slides.length) % slides.length;
            slides[activeIndex].classList.add('active');
        };

        const prevButton = carousel.querySelector('.carousel-control-prev');
        const nextButton = carousel.querySelector('.carousel-control-next');

        if (prevButton) {
            prevButton.addEventListener('click', (event) => {
                event.preventDefault();
                showSlide(activeIndex - 1);
            });
        }

        if (nextButton) {
            nextButton.addEventListener('click', (event) => {
                event.preventDefault();
                showSlide(activeIndex + 1);
            });
        }

        const intervalMs = parseInt(carousel.dataset.bsInterval, 10);
        const autoAdvanceMs = Number.isNaN(intervalMs) ? 4000 : intervalMs;
        if (autoAdvanceMs > 0) {
            setInterval(() => {
                showSlide(activeIndex + 1);
            }, autoAdvanceMs);
        }
    });
}

function renderProjectWithIframeFallback(contentArea, filePath) {
    const frame = document.createElement('iframe');
    frame.src = filePath;
    frame.title = 'Project content';
    frame.style.width = '100%';
    frame.style.height = '100%';
    frame.style.border = '0';
    frame.style.background = 'transparent';
    frame.style.display = 'block';

    frame.addEventListener('load', () => {
        try {
            const frameDoc = frame.contentDocument || frame.contentWindow.document;
            if (!frameDoc || !frameDoc.body) return;

            frameDoc.body.style.margin = '0';
            frameDoc.body.style.padding = '1.5rem';
            frameDoc.body.style.backgroundColor = '#1a1a1a';
            frameDoc.body.style.color = '#ffffff';
            frameDoc.body.style.fontFamily = "'Inter', sans-serif";
            frameDoc.body.style.lineHeight = '1.6';

            frameDoc.querySelectorAll('h2').forEach((el) => {
                el.style.color = '#ffbd23';
                el.style.marginBottom = '1rem';
                el.style.fontSize = '2rem';
            });

            frameDoc.querySelectorAll('h3').forEach((el) => {
                el.style.color = '#ffffff';
                el.style.margin = '1.25rem 0 0.75rem';
                el.style.fontSize = '1.3rem';
            });

            frameDoc.querySelectorAll('p').forEach((el) => {
                el.style.marginBottom = '1rem';
                el.style.color = '#ffffff';
            });

            frameDoc.querySelectorAll('ul').forEach((el) => {
                el.style.margin = '0 0 1rem 1.25rem';
                el.style.padding = '0';
            });

            frameDoc.querySelectorAll('li').forEach((el) => {
                el.style.marginBottom = '0.5rem';
            });
            initializePhotographyCarousels(frameDoc);
        }

        catch (styleError) {
            console.error('Unable to style iframe content:', styleError);
        }
    });

    contentArea.innerHTML = '';
    contentArea.appendChild(frame);
}

// draggable window
let draggedWindow = null;
let offsetX = 0;
let offsetY = 0;
let windowCounter = 0;

function openProjectWindow(filePath) {
    windowCounter++;
    const windowId = 'project-window-' + windowCounter;

    // create draggable window
    const windowDiv = document.createElement('div');
    windowDiv.id = windowId;
    windowDiv.className = 'draggable-window';
    windowDiv.dataset.filePath = filePath;
    
    // check for saved positions
    const savedPosition = localStorage.getItem('windowPos_' + filePath);
    const windowWidth = 800;
    const windowHeight = 600;
    if (savedPosition) {
        const pos = JSON.parse(savedPosition);
        windowDiv.style.left = pos.left + 'px';
        windowDiv.style.top = pos.top + 'px';
    } else {
        // open in center if no saved position
        const left = Math.max(0, (window.innerWidth - windowWidth) / 2);
        const top = Math.max(0, (window.innerHeight - windowHeight) / 2);
        windowDiv.style.left = left + 'px';
        windowDiv.style.top = top + 'px';
    }
    windowDiv.style.width = windowWidth + 'px';
    windowDiv.style.height = windowHeight + 'px';

    // title bar
    const titleBar = document.createElement('div');
    titleBar.className = 'window-title-bar';
    titleBar.innerHTML = `
        <span class="window-title">${filePath.split('/').pop().replace('.html', '').toUpperCase()}</span>
        <button class="window-close" onclick="closeProjectWindow('${windowId}', '${filePath}')">&times;</button>
    `;

    // content area
    const contentArea = document.createElement('div');
    contentArea.className = 'window-content';

    windowDiv.appendChild(titleBar);
    windowDiv.appendChild(contentArea);
    document.body.appendChild(windowDiv);

    // make window draggable
    makeWindowDraggable(windowId, titleBar, filePath);

    // bring window to front when clicked
    windowDiv.addEventListener('click', () => {
        const maxZ = Math.max(...Array.from(document.querySelectorAll('.draggable-window')).map(el => parseInt(window.getComputedStyle(el).zIndex) || 0)) + 1;
        windowDiv.style.zIndex = maxZ;
    });

    // load content from HTML files
    loadProjectContent(filePath).then(content => {
        contentArea.innerHTML = content;
        initializePhotographyCarousels(contentArea);
    }).catch(error => {
        console.error('Failed to load project via fetch, using iframe fallback:', filePath, error);
        renderProjectWithIframeFallback(contentArea, filePath);
    });
}

function closeProjectWindow(windowId, filePath) {
    const windowEl = document.getElementById(windowId);
    if (windowEl) {
        if (filePath) {
            const position = {
                left: windowEl.offsetLeft,
                top: windowEl.offsetTop
            };
            localStorage.setItem('windowPos_' + filePath, JSON.stringify(position));
        }
        windowEl.remove();
    }
}

function makeWindowDraggable(windowId, titleBar, filePath) {
    const windowEl = document.getElementById(windowId);
    
    titleBar.addEventListener('mousedown', (e) => {
        draggedWindow = windowEl;
        offsetX = e.clientX - windowEl.offsetLeft;
        offsetY = e.clientY - windowEl.offsetTop;
        draggedWindow.style.zIndex = Math.max(...Array.from(document.querySelectorAll('.draggable-window')).map(el => parseInt(window.getComputedStyle(el).zIndex) || 0)) + 1;
    });
    
    document.addEventListener('mousemove', (e) => {
        if (draggedWindow && draggedWindow.id === windowId) {
            draggedWindow.style.left = (e.clientX - offsetX) + 'px';
            draggedWindow.style.top = (e.clientY - offsetY) + 'px';
            
            if (filePath) {
                const position = {
                    left: draggedWindow.offsetLeft,
                    top: draggedWindow.offsetTop
                };
                localStorage.setItem('windowPos_' + filePath, JSON.stringify(position));
            }
        }
    });
    
    document.addEventListener('mouseup', () => {
        draggedWindow = null;
    });
}

// press ESC to close windows
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const windows = Array.from(document.querySelectorAll('.draggable-window'));
        if (windows.length > 0) {
            const topWindow = windows.reduce((top, current) => {
                const topZ = parseInt(window.getComputedStyle(top).zIndex) || 0;
                const currentZ = parseInt(window.getComputedStyle(current).zIndex) || 0;
                return currentZ > topZ ? current : top;
            });
            const filePath = topWindow.dataset.filePath || '';
            closeProjectWindow(topWindow.id, filePath);
        }
    }
});

// reset window positions when tab is closed
window.addEventListener('beforeunload', () => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith('windowPos_')) {
            localStorage.removeItem(key);
        }
    });
});
document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('container');
    const svg = document.querySelector('.arrows-layer');
    let circles = {};
    let selectedCircles = [];
    let nextId = 3; // Commence à 3 car nous avons déjà Début (1) et Fin (2)
    let isDragging = false;
    let dragCircle = null;
    let offsetX, offsetY;
    let isConnectMode = false;
    let connectionStart = null;

    // Initialisation avec deux cercles (Début et Fin)
    createCircle('Début', 100, 100, '#2196F3');
    createCircle('Fin', 400, 100, '#F44336');
    updateArrows();

    // Gestion des boutons
    document.getElementById('addCircle').addEventListener('click', addCircle);
    document.getElementById('removeCircle').addEventListener('click', removeSelectedCircle);
    document.getElementById('connectCircles').addEventListener('click', toggleConnectMode);
    document.getElementById('disconnectCircles').addEventListener('click', disconnectSelectedCircles);
    document.getElementById('clearAll').addEventListener('click', clearAll);
    document.getElementById('save').addEventListener('click', saveDiagram);
    document.getElementById('load').addEventListener('click', loadDiagram);

    function createCircle(label, x, y, color = null) {
        const circleId = `circle-${nextId++}`;
        const circle = document.createElement('div');
        circle.className = 'circle';
        circle.id = circleId;
        circle.textContent = label;
        circle.style.left = `${x}px`;
        circle.style.top = `${y}px`;
        
        if (!color) {
            const hue = Math.floor(Math.random() * 360);
            color = `hsl(${hue}, 70%, 50%)`;
        }
        circle.style.backgroundColor = color;
        
        container.appendChild(circle);
        circles[circleId] = {
            element: circle,
            id: circleId,
            label: label,
            x: x,
            y: y,
            connectsTo: [],
            color: color
        };
        
        circle.addEventListener('mousedown', startDrag);
        circle.addEventListener('click', toggleSelection);
        
        return circleId;
    }

    function startDrag(e) {
        if (isConnectMode) {
            if (connectionStart === null) {
                connectionStart = e.target.id;
                e.target.classList.add('selected');
            } else {
                const targetId = e.target.id;
                if (connectionStart !== targetId) {
                    connectCircles(connectionStart, targetId);
                }
                document.querySelector(`#${connectionStart}`).classList.remove('selected');
                connectionStart = null;
            }
            return;
        }
        
        isDragging = true;
        dragCircle = e.target;
        
        const rect = dragCircle.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        dragCircle.style.zIndex = 100;
        
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
        e.preventDefault();
    }

    function drag(e) {
        if (!isDragging) return;
        
        const containerRect = container.getBoundingClientRect();
        let x = e.clientX - containerRect.left - offsetX;
        let y = e.clientY - containerRect.top - offsetY;
        
        x = Math.max(0, Math.min(x, containerRect.width - dragCircle.offsetWidth));
        y = Math.max(0, Math.min(y, containerRect.height - dragCircle.offsetHeight));
        
        dragCircle.style.left = `${x}px`;
        dragCircle.style.top = `${y}px`;
        
        const circleId = dragCircle.id;
        circles[circleId].x = x;
        circles[circleId].y = y;
        
        updateArrows();
    }

    function stopDrag() {
        isDragging = false;
        if (dragCircle) {
            dragCircle.style.zIndex = '';
            dragCircle = null;
        }
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);
    }

    function toggleSelection(e) {
        if (isConnectMode) return;
        
        const circle = e.target;
        const index = selectedCircles.indexOf(circle.id);
        
        if (index === -1) {
            selectedCircles.push(circle.id);
            circle.classList.add('selected');
        } else {
            selectedCircles.splice(index, 1);
            circle.classList.remove('selected');
        }
        
        updateButtonStates();
    }

    function addCircle() {
        const containerRect = container.getBoundingClientRect();
        const x = Math.floor(Math.random() * (containerRect.width - 100)) + 20;
        const y = Math.floor(Math.random() * (containerRect.height - 100)) + 20;
        
        createCircle(`${nextId-2}`, x, y);
        updateButtonStates();
    }

    function removeSelectedCircle() {
        selectedCircles.forEach(circleId => {
            if (circles[circleId]) {
                Object.values(circles).forEach(circle => {
                    const index = circle.connectsTo.indexOf(circleId);
                    if (index !== -1) {
                        circle.connectsTo.splice(index, 1);
                    }
                });
                
                container.removeChild(circles[circleId].element);
                delete circles[circleId];
            }
        });
        
        selectedCircles = [];
        updateArrows();
        updateButtonStates();
    }

    function toggleConnectMode() {
        isConnectMode = !isConnectMode;
        const btn = document.getElementById('connectCircles');
        
        if (isConnectMode) {
            btn.style.backgroundColor = '#FF5722';
            btn.textContent = 'Mode Connexion (cliquez sur 2 cercles)';
            selectedCircles.forEach(circleId => {
                document.getElementById(circleId).classList.remove('selected');
            });
            selectedCircles = [];
        } else {
            btn.style.backgroundColor = '#4CAF50';
            btn.textContent = 'Connecter les cercles';
            if (connectionStart) {
                document.getElementById(connectionStart).classList.remove('selected');
                connectionStart = null;
            }
        }
        updateButtonStates();
    }

    function connectCircles(sourceId, targetId) {
        if (!circles[sourceId] || !circles[targetId]) return;
        
        if (!circles[sourceId].connectsTo.includes(targetId)) {
            circles[sourceId].connectsTo.push(targetId);
            updateArrows();
        }
    }

    function disconnectSelectedCircles() {
        if (selectedCircles.length !== 2) {
            alert('Sélectionnez exactement 2 cercles à déconnecter');
            return;
        }
        
        const [circle1, circle2] = selectedCircles;
        
        const index1 = circles[circle1].connectsTo.indexOf(circle2);
        if (index1 !== -1) {
            circles[circle1].connectsTo.splice(index1, 1);
        }
        
        const index2 = circles[circle2].connectsTo.indexOf(circle1);
        if (index2 !== -1) {
            circles[circle2].connectsTo.splice(index2, 1);
        }
        
        updateArrows();
    }

    function updateArrows() {
        svg.innerHTML = '<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" /></marker></defs>';
        
        Object.values(circles).forEach(circle => {
            circle.connectsTo.forEach(targetId => {
                if (circles[targetId]) {
                    const source = circle;
                    const target = circles[targetId];
                    
                    const x1 = source.x + 30;
                    const y1 = source.y + 30;
                    const x2 = target.x + 30;
                    const y2 = target.y + 30;
                    
                    if (source.id === target.id) {
                        drawSelfLoop(x1, y1);
                        return;
                    }
                    
                    const angle = Math.atan2(y2 - y1, x2 - x1);
                    const radius = 30;
                    const startX = x1 + radius * Math.cos(angle);
                    const startY = y1 + radius * Math.sin(angle);
                    const endX = x2 - radius * Math.cos(angle);
                    const endY = y2 - radius * Math.sin(angle);
                    
                    const arrow = document.createElementNS("http://www.w3.org/2000/svg", 'line');
                    arrow.setAttribute('x1', startX);
                    arrow.setAttribute('y1', startY);
                    arrow.setAttribute('x2', endX);
                    arrow.setAttribute('y2', endY);
                    arrow.setAttribute('stroke', '#666');
                    arrow.setAttribute('stroke-width', '2');
                    arrow.setAttribute('marker-end', 'url(#arrowhead)');
                    
                    svg.appendChild(arrow);
                }
            });
        });
    }

    function drawSelfLoop(x, y) {
        const loop = document.createElementNS("http://www.w3.org/2000/svg", 'path');
        const radius = 30;
        loop.setAttribute('d', `M ${x + radius} ${y} A ${radius} ${radius} 0 1 1 ${x} ${y + radius} A ${radius} ${radius} 0 1 1 ${x + radius} ${y}`);
        loop.setAttribute('stroke', '#666');
        loop.setAttribute('stroke-width', '2');
        loop.setAttribute('fill', 'none');
        loop.setAttribute('marker-end', 'url(#arrowhead)');
        
        svg.appendChild(loop);
    }

    function clearAll() {
        Object.values(circles).forEach(circle => {
            container.removeChild(circle.element);
        });
        
        circles = {};
        selectedCircles = [];
        nextId = 1;
        svg.innerHTML = '<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" /></marker></defs>';
        
        createCircle('Début', 100, 100, '#2196F3');
        createCircle('Fin', 400, 100, '#F44336');
        updateButtonStates();
    }

    function saveDiagram() {
        const diagramData = {
            circles: Object.values(circles).map(circle => ({
                id: circle.id,
                label: circle.label,
                x: circle.x,
                y: circle.y,
                connectsTo: circle.connectsTo,
                color: circle.color
            })),
            nextId: nextId
        };
        
        localStorage.setItem('diagramData', JSON.stringify(diagramData));
        alert('Diagramme sauvegardé avec succès!');
    }

    function loadDiagram() {
        const savedData = localStorage.getItem('diagramData');
        if (!savedData) {
            alert('Aucun diagramme sauvegardé trouvé');
            return;
        }
        
        clearAll();
        
        try {
            const diagramData = JSON.parse(savedData);
            nextId = diagramData.nextId;
            
            diagramData.circles.forEach(circleData => {
                const circleId = createCircle(
                    circleData.label,
                    circleData.x,
                    circleData.y,
                    circleData.color
                );
                
                circles[circleId].connectsTo = circleData.connectsTo;
            });
            
            updateArrows();
            alert('Diagramme chargé avec succès!');
        } catch (e) {
            alert('Erreur lors du chargement du diagramme: ' + e.message);
        }
    }

    function updateButtonStates() {
        const removeBtn = document.getElementById('removeCircle');
        const connectBtn = document.getElementById('connectCircles');
        const disconnectBtn = document.getElementById('disconnectCircles');
        
        removeBtn.disabled = selectedCircles.length === 0;
        disconnectBtn.disabled = selectedCircles.length !== 2;
        connectBtn.disabled = isConnectMode;
    }
});
class FlotComplet {
    constructor() {
        this.capacites = new Map();
        this.flux = new Map();
        this.capacitesResiduelles = new Map();
        this.sommets = new Set();
        this.arcs = [];
        this.etapes = [];
        this.source = null;
        this.puits = null;
    }

    initialiserReseau(donnees) {
        this.capacites.clear();
        this.flux.clear();
        this.capacitesResiduelles.clear();
        this.sommets.clear();
        this.arcs = [];
        this.etapes = [];

        this.source = donnees.source;
        this.puits = donnees.sink;

        donnees.nodes.forEach(node => {
            this.sommets.add(node.data.id);
        });

        donnees.edges.forEach(edge => {
            const origine = edge.data.source;
            const destination = edge.data.target;
            const capacite = parseInt(edge.data.capacity);
            
            this.ajouterArc(origine, destination, capacite);
        });
    }

    ajouterArc(origine, destination, capacite) {
        const arc = `${origine}-${destination}`;
        this.capacites.set(arc, capacite);
        this.flux.set(arc, 0);
        this.capacitesResiduelles.set(arc, capacite);
        this.arcs.push({origine, destination, arc});
    }

    trouverCheminSimple(arcChoisi) {
        const [origine, destination] = arcChoisi.split('-');
        
        const cheminVersOrigine = this.bfs(this.source, origine);
        const cheminVersDestination = this.bfs(destination, this.puits);
        
        if (cheminVersOrigine && cheminVersDestination) {
            return [...cheminVersOrigine, destination, ...cheminVersDestination.slice(1)];
        }
        return null;
    }

    bfs(debut, fin) {
        if (debut === fin) return [debut];
        
        const visite = new Set();
        const queue = [{sommet: debut, chemin: [debut]}];
        visite.add(debut);

        while (queue.length > 0) {
            const {sommet, chemin} = queue.shift();
            
            for (const arc of this.arcs) {
                if (arc.origine === sommet && this.capacitesResiduelles.get(arc.arc) > 0) {
                    if (arc.destination === fin) {
                        return [...chemin, arc.destination];
                    }
                    
                    if (!visite.has(arc.destination)) {
                        visite.add(arc.destination);
                        queue.push({
                            sommet: arc.destination,
                            chemin: [...chemin, arc.destination]
                        });
                    }
                }
            }
        }
        return null;
    }

    estElementaire(chemin) {
        const sommetsVisites = new Set();
        for (const sommet of chemin) {
            if (sommetsVisites.has(sommet)) {
                return false;
            }
            sommetsVisites.add(sommet);
        }
        return true;
    }

    mettreAJourFlux(chemin, fluxAAjouter) {
        for (let i = 0; i < chemin.length - 1; i++) {
            const arc = `${chemin[i]}-${chemin[i + 1]}`;
            if (this.capacites.has(arc)) {
                this.flux.set(arc, this.flux.get(arc) + fluxAAjouter);
                this.capacitesResiduelles.set(arc, this.capacites.get(arc) - this.flux.get(arc));
            }
        }
    }

    trouverArcCapaciteMinimale() {
        let arcMin = null;
        let capaciteMin = Infinity;
        
        for (const [arc, capacite] of this.capacitesResiduelles) {
            if (capacite > 0 && capacite < capaciteMin) {
                capaciteMin = capacite;
                arcMin = arc;
            }
        }
        
        return {arc: arcMin, capacite: capaciteMin};
    }

    estFlotComplet() {
        return this.bfs(this.source, this.puits) === null;
    }

    enregistrerEtat(numeroEtape, arcChoisi = null, chemin = null, action = null) {
        const arcsEtat = this.arcs.map(arc => ({
            arc: arc.arc,
            origine: arc.origine,
            destination: arc.destination,
            capacite: this.capacites.get(arc.arc),
            flux: this.flux.get(arc.arc),
            capaciteResiduelle: this.capacitesResiduelles.get(arc.arc),
            estSature: this.capacitesResiduelles.get(arc.arc) === 0
        }));

        const etat = {
            etape: numeroEtape,
            arcChoisi: arcChoisi,
            chemin: chemin,
            action: action,
            arcs: arcsEtat,
            estComplet: this.estFlotComplet(),
            fluxTotal: this.calculerFluxTotal()
        };
        
        this.etapes.push(etat);
        return etat;
    }

    calculerFluxTotal() {
        let fluxTotal = 0;
        for (const arc of this.arcs) {
            if (arc.origine === this.source) {
                fluxTotal += this.flux.get(arc.arc);
            }
        }
        return fluxTotal;
    }

    algorithmeManuelBloch() {
        this.etapes = [];
        
        this.enregistrerEtat(0, null, null, 'Initialisation - tous les flux à 0');
        
        let numeroEtape = 1;
        
        while (!this.estFlotComplet()) {
            const {arc: arcChoisi, capacite: capaciteMin} = this.trouverArcCapaciteMinimale();
            
            if (!arcChoisi) {
                this.enregistrerEtat(numeroEtape, null, null, 'Aucun arc praticable trouvé - arrêt');
                break;
            }
            
            const chemin = this.trouverCheminSimple(arcChoisi);
            
            if (!chemin) {
                this.capacitesResiduelles.set(arcChoisi, 0);
                this.enregistrerEtat(numeroEtape, arcChoisi, null, 'Arc bloqué - aucun chemin trouvé');
                numeroEtape++;
                continue;
            }
            
            if (this.estElementaire(chemin)) {
                this.mettreAJourFlux(chemin, capaciteMin);
                this.enregistrerEtat(numeroEtape, arcChoisi, chemin, `Flux de ${capaciteMin} ajouté sur le chemin`);
            } else {
                this.capacitesResiduelles.set(arcChoisi, 0);
                this.enregistrerEtat(numeroEtape, arcChoisi, chemin, 'Chemin non élémentaire - arc bloqué');
            }
            
            numeroEtape++;
            
            if (numeroEtape > 1000) {
                this.enregistrerEtat(numeroEtape, null, null, 'Arrêt de sécurité - trop d\'itérations');
                break;
            }
        }
        
        return {
            success: true,
            fluxTotal: this.calculerFluxTotal(),
            nombreEtapes: this.etapes.length - 1,
            etapes: this.etapes,
            parametres: {
                source: this.source,
                sink: this.puits,
                nombreSommets: this.sommets.size,
                nombreArcs: this.arcs.length
            }
        };
    }
}








let resultatsGlobaux = null;
let etapeActuelle = 0;

function calculerFlot() {
    const donnees = document.getElementById('networkData').value;
    const errorDiv = document.getElementById('error');
    const resultsDiv = document.getElementById('results');
    
    try {
        const donneesJSON = JSON.parse(donnees);
        
        if (!donneesJSON.source || !donneesJSON.sink || !donneesJSON.nodes || !donneesJSON.edges) {
            throw new Error('Données invalides. Champs requis: source, sink, nodes, edges');
        }
        
        const flot = new FlotComplet();
        flot.initialiserReseau(donneesJSON);
        const resultats = flot.algorithmeManuelBloch();
        
        if (resultats.success) {
            resultatsGlobaux = resultats;
            afficherResultats(resultats);
            errorDiv.classList.add('hidden');
            resultsDiv.classList.remove('hidden');
        } else {
            throw new Error(resultats.error || 'Erreur inconnue');
        }
        
    } catch (error) {
        errorDiv.textContent = 'Erreur: ' + error.message;
        errorDiv.classList.remove('hidden');
        resultsDiv.classList.add('hidden');
    }
}

function afficherResultats(resultats) {
    afficherResume(resultats);
    creerNavigationEtapes(resultats.etapes);
    afficherTableau(resultats.etapes[0]); // Afficher la première étape
}

function afficherResume(resultats) {
    const summaryDiv = document.getElementById('summary');
    
    summaryDiv.innerHTML = `
        <h3>📊 Résumé de l'algorithme</h3>
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-value">${resultats.fluxTotal}</div>
                <div class="summary-label">Flux total</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${resultats.nombreEtapes}</div>
                <div class="summary-label">Étapes</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${resultats.parametres.nombreSommets}</div>
                <div class="summary-label">Sommets</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${resultats.parametres.nombreArcs}</div>
                <div class="summary-label">Arcs</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${resultats.parametres.source}</div>
                <div class="summary-label">Source</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${resultats.parametres.sink}</div>
                <div class="summary-label">Puits</div>
            </div>
        </div>
    `;
}

function creerNavigationEtapes(etapes) {
    const navDiv = document.getElementById('stepNavigation');
    navDiv.innerHTML = '';
    
    etapes.forEach((etape, index) => {
        const btn = document.createElement('button');
        btn.className = 'step-btn';
        btn.textContent = `Étape ${etape.etape}`;
        btn.onclick = () => {
            etapeActuelle = index;
            afficherTableau(etape);
            // Mettre à jour les boutons actifs
            document.querySelectorAll('.step-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
        
        if (index === 0) btn.classList.add('active');
        navDiv.appendChild(btn);
    });
}

function afficherTableau(etape) {
    const tableContainer = document.getElementById('tableContainer');
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th rowspan="2">Étape</th>
                    <th rowspan="2">Arc choisi</th>
                    <th rowspan="2">Chemin</th>
                    <th rowspan="2">Action</th>
                    <th colspan="${etape.arcs.length}">État des arcs</th>
                    <th rowspan="2">Flux total</th>
                    <th rowspan="2">Statut</th>
                </tr>
                <tr>
    `;
    
    // En-têtes pour chaque arc
    etape.arcs.forEach(arc => {
        html += `<th>${arc.arc}<br><small>C: ${arc.capacite}</small></th>`;
    });
    html += `</tr></thead><tbody>`;
    
    // Ligne de l'étape
    html += `<tr>`;
    html += `<td class="etape-cell">${etape.etape}</td>`;
    html += `<td>${etape.arcChoisi ? `<span class="arc-choisi">${etape.arcChoisi}</span>` : '-'}</td>`;
    html += `<td>${etape.chemin ? `<span class="chemin">${etape.chemin.join(' → ')}</span>` : '-'}</td>`;
    html += `<td class="action-cell">${etape.action || '-'}</td>`;
    
    // État de chaque arc
    etape.arcs.forEach(arc => {
        const classe = arc.estSature ? 'arc-sature' : 'arc-normal';
        html += `<td class="${classe}">
            <div class="flux-value">${arc.flux}</div>
            <div class="capacite-value">(${arc.capaciteResiduelle})</div>
        </td>`;
    });
    
    html += `<td class="flux-value">${etape.fluxTotal}</td>`;
    html += `<td>${etape.estComplet ? '✅ Complet' : '⏳ En cours'}</td>`;
    html += `</tr></tbody></table>`;
    
    tableContainer.innerHTML = html;
}

function voirtableau() {
    try {
        const nodes = cy.nodes().map(n => ({ data: { id: n.id() } }));
        const edges = cy.edges().map(e => ({
            data: {
                source: e.data('source'),
                target: e.data('target'),
                capacity: e.data('capacity')
            }
        }));

        const source = document.getElementById('source-select').value;
        const sink = document.getElementById('sink-select').value;

        if (!source || !sink) {
            alert("Veuillez sélectionner un sommet de début et un sommet de fin.");
            return;
        }

        const donnees = {
            source,
            sink,
            nodes,
            edges
        };

        const flot = new FlotComplet();
        flot.initialiserReseau(donnees);
        const resultats = flot.algorithmeManuelBloch();

        if (resultats.success) {
            resultatsGlobaux = resultats;
            afficherResultats(resultats);
            document.getElementById('error').classList.add('hidden');
            document.getElementById('results').classList.remove('hidden');
        } else {
            throw new Error("Erreur dans l’algorithme.");
        }

    } catch (error) {
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = 'Erreur: ' + error.message;
        errorDiv.classList.remove('hidden');
        document.getElementById('results').classList.add('hidden');
    }
}

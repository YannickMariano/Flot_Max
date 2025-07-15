const express = require('express');
const cors = require('cors');

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

    // Initialiser le réseau à partir des données JSON
    initialiserReseau(donnees) {
        this.capacites.clear();
        this.flux.clear();
        this.capacitesResiduelles.clear();
        this.sommets.clear();
        this.arcs = [];
        this.etapes = [];

        this.source = donnees.source;
        this.puits = donnees.sink;

        // Ajouter les sommets
        donnees.nodes.forEach(node => {
            this.sommets.add(node.data.id);
        });

        // Ajouter les arcs
        donnees.edges.forEach(edge => {
            const origine = edge.data.source;
            const destination = edge.data.target;
            const capacite = parseInt(edge.data.capacity);
            
            this.ajouterArc(origine, destination, capacite);
        });
    }

    // Ajouter un arc avec sa capacité
    ajouterArc(origine, destination, capacite) {
        const arc = `${origine}-${destination}`;
        this.capacites.set(arc, capacite);
        this.flux.set(arc, 0);
        this.capacitesResiduelles.set(arc, capacite);
        this.arcs.push({origine, destination, arc});
    }

    // Trouver un chemin simple passant par un arc donné
    trouverCheminSimple(arcChoisi) {
        const [origine, destination] = arcChoisi.split('-');
        
        // Chemin de la source à l'origine de l'arc
        const cheminVersOrigine = this.bfs(this.source, origine);
        // Chemin de la destination de l'arc vers le puits
        const cheminVersDestination = this.bfs(destination, this.puits);
        
        if (cheminVersOrigine && cheminVersDestination) {
            return [...cheminVersOrigine, destination, ...cheminVersDestination.slice(1)];
        }
        return null;
    }

    // Recherche en largeur (BFS) pour trouver un chemin
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

    // Vérifier si un chemin est élémentaire (sans circuit)
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

    // Mettre à jour les flux sur un chemin
    mettreAJourFlux(chemin, fluxAAjouter) {
        for (let i = 0; i < chemin.length - 1; i++) {
            const arc = `${chemin[i]}-${chemin[i + 1]}`;
            if (this.capacites.has(arc)) {
                this.flux.set(arc, this.flux.get(arc) + fluxAAjouter);
                this.capacitesResiduelles.set(arc, this.capacites.get(arc) - this.flux.get(arc));
            }
        }
    }

    // Trouver l'arc de capacité résiduelle la plus faible
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

    // Vérifier si le flot est complet
    estFlotComplet() {
        // Un flot est complet si tout chemin de la source au puits contient au moins un arc saturé
        return this.bfs(this.source, this.puits) === null;
    }

    // Enregistrer l'état actuel du réseau
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

    // Calculer le flux total sortant de la source
    calculerFluxTotal() {
        let fluxTotal = 0;
        for (const arc of this.arcs) {
            if (arc.origine === this.source) {
                fluxTotal += this.flux.get(arc.arc);
            }
        }
        return fluxTotal;
    }

    // Algorithme principal de Manuel Bloch
    algorithmeManuelBloch() {
        this.etapes = [];
        
        // Initialisation
        this.enregistrerEtat(0, null, null, 'Initialisation - tous les flux à 0');
        
        let numeroEtape = 1;
        
        while (!this.estFlotComplet()) {
            // Choisir l'arc de capacité résiduelle la plus faible
            const {arc: arcChoisi, capacite: capaciteMin} = this.trouverArcCapaciteMinimale();
            
            if (!arcChoisi) {
                this.enregistrerEtat(numeroEtape, null, null, 'Aucun arc praticable trouvé - arrêt');
                break;
            }
            
            // Trouver un chemin simple passant par cet arc
            const chemin = this.trouverCheminSimple(arcChoisi);
            
            if (!chemin) {
                // Bloquer l'arc en le saturant
                this.capacitesResiduelles.set(arcChoisi, 0);
                this.enregistrerEtat(numeroEtape, arcChoisi, null, 'Arc bloqué - aucun chemin trouvé');
                numeroEtape++;
                continue;
            }
            
            if (this.estElementaire(chemin)) {
                // Chemin élémentaire - faire passer le flux
                this.mettreAJourFlux(chemin, capaciteMin);
                this.enregistrerEtat(numeroEtape, arcChoisi, chemin, `Flux de ${capaciteMin} ajouté sur le chemin`);
            } else {
                // Chemin non élémentaire - bloquer l'arc de capacité la plus faible du circuit
                this.capacitesResiduelles.set(arcChoisi, 0);
                this.enregistrerEtat(numeroEtape, arcChoisi, chemin, 'Chemin non élémentaire - arc bloqué');
            }
            
            numeroEtape++;
            
            // Sécurité pour éviter les boucles infinies
            if (numeroEtape > 1000) {
                this.enregistrerEtat(numeroEtape, null, null, 'Arrêt de sécurité - trop d\'itérations');
                break;
            }
        }
        
        return {
            success: true,
            fluxTotal: this.calculerFluxTotal(),
            nombreEtapes: this.etapes.length - 1, // -1 pour ne pas compter l'initialisation
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

// Fonction principale pour traiter les données
function calculerFlotComplet(donnees) {
    try {
        const flot = new FlotComplet();
        flot.initialiserReseau(donnees);
        return flot.algorithmeManuelBloch();
    } catch (error) {
        return {
            success: false,
            error: error.message,
            stack: error.stack
        };
    }
}

// Configuration de l'API Express
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Route principale pour calculer le flot complet
app.post('/flot-complet', (req, res) => {
    try {
        const donnees = req.body;
        
        // Validation des données
        if (!donnees.source || !donnees.sink || !donnees.nodes || !donnees.edges) {
            return res.status(400).json({
                success: false,
                error: 'Données invalides. Champs requis: source, sink, nodes, edges'
            });
        }
        
        const resultat = calculerFlotComplet(donnees);
        res.json(resultat);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur',
            details: error.message
        });
    }
});

// Route pour tester l'API avec les données de test que vous avez fournies
app.get('/test', (req, res) => {
    const donneesTest = {
        "source": "S",
        "sink": "T",
        "nodes": [
            { "data": { "id": "S" } },
            { "data": { "id": "A" } },
            { "data": { "id": "B" } },
            { "data": { "id": "C" } },
            { "data": { "id": "D" } },
            { "data": { "id": "E" } },
            { "data": { "id": "F" } },
            { "data": { "id": "G" } },
            { "data": { "id": "T" } }
        ],
        "edges": [
            { "data": { "source": "S", "target": "A", "capacity": "45" } },
            { "data": { "source": "S", "target": "B", "capacity": "25" } },
            { "data": { "source": "S", "target": "C", "capacity": "30" } },
            { "data": { "source": "A", "target": "D", "capacity": "10" } },
            { "data": { "source": "A", "target": "E", "capacity": "15" } },
            { "data": { "source": "A", "target": "G", "capacity": "20" } },
            { "data": { "source": "B", "target": "D", "capacity": "20" } },
            { "data": { "source": "B", "target": "E", "capacity": "5" } },
            { "data": { "source": "B", "target": "F", "capacity": "15" } },
            { "data": { "source": "C", "target": "F", "capacity": "10" } },
            { "data": { "source": "C", "target": "G", "capacity": "15" } },
            { "data": { "source": "D", "target": "T", "capacity": "30" } },
            { "data": { "source": "E", "target": "T", "capacity": "10" } },
            { "data": { "source": "F", "target": "T", "capacity": "20" } },
            { "data": { "source": "G", "target": "T", "capacity": "40" } }
        ]
    };
    
    const resultat = calculerFlotComplet(donneesTest);
    res.json(resultat);
});

// Route d'information
app.get('/', (req, res) => {
    res.json({
        message: 'API Flot Complet - Algorithme de Manuel Bloch',
        version: '1.0.0',
        endpoints: {
            'POST /flot-complet': 'Calculer le flot complet',
            'GET /test': 'Tester avec des données d\'exemple',
            'GET /': 'Informations sur l\'API'
        },
        format: {
            source: 'string - ID du sommet source',
            sink: 'string - ID du sommet puits',
            nodes: 'array - Liste des sommets avec leurs IDs',
            edges: 'array - Liste des arcs avec source, target et capacity'
        }
    });
});

// Démarrage du serveur
app.listen(port, () => {
    console.log(`🚀 API Flot Complet démarrée sur le port ${port}`);
    console.log(`📖 Documentation: http://localhost:${port}/`);
    console.log(`🧪 Test: http://localhost:${port}/test`);
});


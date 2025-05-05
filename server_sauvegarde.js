const express = require('express');
const path = require('path');
const db = require('./config/db'); // Pool de connexions

const app = express();
app.use(express.json());
const PORT = 3000;

/* ===== API ROUTES ===== */

// === Collaborateurs ===
// Récupérer la liste des collaborateurs
app.get('/api/collaborateurs', async (req, res) => {
    try {
        const query = `
            SELECT 
                collaborateurs.id_collaborateur, 
                collaborateurs.nom, 
                collaborateurs.prenom, 
                services.nom AS service,
                services.id_service AS id_service
            FROM collaborateurs
            LEFT JOIN services ON collaborateurs.id_service = services.id_service;
        `;

        const [results] = await db.execute(query);

        res.json(results);
    } catch (err) {
        console.error('Erreur lors de la récupération des collaborateurs :', err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

app.get('/api/materiels-complets', async (req, res) => {
    const query = `
        SELECT 
            materiels.id_materiel,
            materiels.marque,
            materiels.modele,
            materiels.num_serie,
            materiels.id_type,
            materiels.id_collaborateur,
            materiels.perdu,
            collaborateurs.nom AS collaborateur_nom,
            collaborateurs.prenom AS collaborateur_prenom,
            collaborateurs.id_service,
            services.nom AS service_nom
        FROM materiels
        LEFT JOIN collaborateurs ON materiels.id_collaborateur = collaborateurs.id_collaborateur
        LEFT JOIN services ON collaborateurs.id_service = services.id_service
    `;
    try {
        const [results] = await db.execute(query);
        res.json(results);
    } catch (err) {
        console.error('Erreur lors de la récupération des matériels :', err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});


// Récupérer les informations d'un collaborateur
app.get('/api/collaborateur/:id', async (req, res) => {
    const collaborateurId = req.params.id;

    const query = `
        SELECT collaborateurs.id_collaborateur, 
               collaborateurs.nom, 
               collaborateurs.prenom, 
               services.nom AS service
        FROM collaborateurs
        LEFT JOIN services ON collaborateurs.id_service = services.id_service
        WHERE collaborateurs.id_collaborateur = ?
    `;

    try {
        const [results] = await db.execute(query, [collaborateurId]);
        res.json(results[0] || {});
    } catch (err) {
        console.error('Erreur lors de la récupération du collaborateur :', err);
        res.status(500).send('Erreur serveur');
    }
});

// === Matériels ===
// Récupérer la liste des matériels
app.get('/api/materiels', async (req, res) => {
    const query = `
        SELECT 
            materiels.id_materiel,
            materiels.marque,
            materiels.modele,
            materiels.num_serie,
            materiels.date_remise,
            materiels.date_rendu,
            materiels.id_type,
            types_materiels.nom_type,
            collaborateurs.nom AS collaborateur_nom,
            collaborateurs.prenom AS collaborateur_prenom
        FROM materiels
        LEFT JOIN collaborateurs ON materiels.id_collaborateur = collaborateurs.id_collaborateur
        LEFT JOIN types_materiels ON materiels.id_type = types_materiels.id_type
    `;

    try {
        const [results] = await db.execute(query);
        res.json(results);
    } catch (err) {
        console.error('Erreur lors de la récupération des matériels :', err);
        res.status(500).send('Erreur serveur');
    }
});


// Récupérer les matériels attribués à un collaborateur
app.get('/api/collaborateur/:id/materiels', async (req, res) => {
    const collaborateurId = req.params.id;

    const query = `
        SELECT 
            materiels.id_materiel, 
            materiels.modele, 
            materiels.marque, 
            materiels.num_serie, 
            materiels.etat,
            materiels.date_remise, 
            materiels.date_rendu,
            materiels.id_type,
            types_materiels.nom_type
        FROM materiels
        LEFT JOIN types_materiels ON materiels.id_type = types_materiels.id_type
        WHERE materiels.id_collaborateur = ?
    `;

    try {
        const [results] = await db.execute(query, [collaborateurId]);
        res.json(results);
    } catch (err) {
        console.error('Erreur lors de la récupération des matériels :', err);
        res.status(500).send('Erreur serveur');
    }
});

app.get('/api/materiels/disponibles', async (req, res) => {
    const query = `
        SELECT 
            materiels.id_materiel,
            materiels.modele,
            materiels.marque,
            materiels.num_serie,
            materiels.etat,
            materiels.id_type,
            materiels.perdu,
            types_materiels.nom_type
        FROM materiels
        LEFT JOIN types_materiels ON materiels.id_type = types_materiels.id_type
        WHERE materiels.id_collaborateur IS NULL
    `;

    try {
        const [results] = await db.execute(query);
        res.json(results);
    } catch (error) {
        console.error('Erreur lors de la récupération des matériels disponibles :', error);
        res.status(500).send('Erreur serveur.');
    }
});

app.get('/api/types_materiels', async (req, res) => {
    try {
        const query = `
            SELECT id_type, nom_type
            FROM types_materiels
        `;
        const [results] = await db.execute(query);
        res.json(results);
    } catch (error) {
        console.error('Erreur lors de la récupération des types de matériels :', error);
        res.status(500).send('Erreur serveur.');
    }
});



app.post('/api/collaborateur/:id/materiels', async (req, res) => {
    const collaborateurId = req.params.id;
    const { id_materiel } = req.body;
    const id_responsable = req.headers['id-responsable'];

    if (!id_materiel || !id_responsable) {
        return res.status(400).send('Paramètres manquants.');
    }

    try {
        // Insérer dans la table historique
        await db.execute(
            `INSERT INTO historique (id_materiel, id_collaborateur, date_remise, id_responsable_remise, perdu)
             VALUES (?, ?, NOW(), ?, FALSE)`,
            [id_materiel, collaborateurId, id_responsable]
        );

        // Mettre à jour la table materiels
        await db.execute(
            `UPDATE materiels SET id_collaborateur = ?, date_remise = NOW(), id_responsable = ? WHERE id_materiel = ?`,
            [collaborateurId, id_responsable, id_materiel]
        );

        res.status(200).send('Matériel attribué avec succès.');
    } catch (error) {
        console.error('Erreur lors de l\'attribution du matériel :', error);
        res.status(500).send('Erreur serveur.');
    }
});

app.post('/api/materiels', async (req, res) => {
    const { marque, modele, num_serie, id_type } = req.body;

    if (!marque || !modele || !num_serie || !id_type) {
        return res.status(400).send('Tous les champs sont obligatoires.');
    }

    try {
        const query = `
            INSERT INTO materiels (marque, modele, num_serie, id_type)
            VALUES (?, ?, ?, ?)
        `;
        await db.execute(query, [marque, modele, num_serie, id_type]);
        res.status(201).send('Matériel ajouté avec succès.');
    } catch (error) {
        console.error('Erreur lors de l\'ajout du matériel :', error);
        res.status(500).send('Erreur serveur.');
    }
});


app.post('/api/materiels/:id/rendu', async (req, res) => {
    const materielId = req.params.id;
    const { id_responsable_rendu } = req.body;

    if (!id_responsable_rendu) {
        return res.status(400).send('ID responsable rendu manquant.');
    }

    try {
        // Mettre à jour la table `historique`
        const [resultHistorique] = await db.execute(
            'UPDATE historique SET date_rendu = NOW(), id_responsable_rendu = ? WHERE id_materiel = ? AND date_rendu IS NULL',
            [id_responsable_rendu, materielId]
        );

        if (resultHistorique.affectedRows === 0) {
            return res.status(404).send('Aucune ligne à mettre à jour dans l\'historique.');
        }

        // Réinitialiser les colonnes dans la table `materiels`
        const [resultMateriels] = await db.execute(
            'UPDATE materiels SET id_collaborateur = NULL, id_responsable = NULL, date_remise = NULL WHERE id_materiel = ?',
            [materielId]
        );

        if (resultMateriels.affectedRows === 0) {
            return res.status(404).send('Matériel introuvable dans la table materiels.');
        }

        res.status(200).send('Matériel marqué comme rendu.');
    } catch (error) {
        console.error('Erreur lors du rendu du matériel :', error);
        res.status(500).send('Erreur serveur.');
    }
});


app.post('/api/materiels/:id/perdu', async (req, res) => {
    const materielId = req.params.id;

    try {
        // Mettre à jour la ligne existante dans la table historique
        const [resultHistorique] = await db.execute(
            `
            UPDATE historique
            SET date_rendu = NOW(), perdu = true
            WHERE id_materiel = ? AND date_rendu IS NULL
            `,
            [materielId]
        );

        if (resultHistorique.affectedRows === 0) {
            return res.status(404).send('Aucune ligne trouvée à mettre à jour. Vérifiez que le matériel a été attribué.');
        }

        // Mettre à jour l'état dans la table materiels (ajouter perdu = true)
        const [resultMateriels] = await db.execute(
            `
            UPDATE materiels
            SET id_collaborateur = NULL, id_responsable = NULL, perdu = true
            WHERE id_materiel = ?
            `,
            [materielId]
        );

        if (resultMateriels.affectedRows === 0) {
            return res.status(404).send('Matériel non trouvé pour mise à jour.');
        }

        res.status(200).send('Matériel marqué comme perdu avec succès.');
    } catch (error) {
        console.error('Erreur lors de la mise à jour du matériel perdu :', error);
        res.status(500).send('Erreur serveur.');
    }
});



app.post('/api/materiels/:id/supprimer', async (req, res) => {
    const materielId = req.params.id;
    const { id_collaborateur } = req.body;

    try {
        // Supprimer la ligne dans l'historique
        const [resultHistorique] = await db.execute(
            'DELETE FROM historique WHERE id_materiel = ? AND id_collaborateur = ?',
            [materielId, id_collaborateur]
        );

        if (resultHistorique.affectedRows === 0) {
            return res.status(404).send('Aucune ligne dans l\'historique trouvée pour ces paramètres.');
        }

        // Réinitialiser les colonnes `id_collaborateur` et `id_responsable` dans la table `materiels`
        const [resultMateriels] = await db.execute(
            'UPDATE materiels SET id_collaborateur = NULL, id_responsable = NULL, date_remise = NULL WHERE id_materiel = ?',
            [materielId]
        );

        if (resultMateriels.affectedRows === 0) {
            return res.status(404).send('Matériel introuvable dans la table materiels.');
        }

        res.status(200).send('Matériel supprimé avec succès.');
    } catch (error) {
        console.error('Erreur lors de la suppression du matériel :', error);
        res.status(500).send('Erreur serveur.');
    }
});



// === Commentaires ===
// Récupérer tous les commentaires d'un collaborateur avec les réponses
app.get('/api/collaborateur/:id/commentaires', async (req, res) => {
    const collaborateurId = req.params.id;

    const query = `
        SELECT c.id_commentaire, c.contenu, c.date_creation, c.date_modification, 
               c.reponse_a, c.id_responsable, c.supprime, s.nom AS service_nom, 
               (SELECT COUNT(*) FROM likes l WHERE l.id_commentaire = c.id_commentaire) AS likes, 
               (SELECT COUNT(*) FROM commentaires r WHERE r.reponse_a = c.id_commentaire) AS nombre_replies
        FROM commentaires c
        LEFT JOIN responsables r ON c.id_responsable = r.id_responsable
        LEFT JOIN services s ON r.id_service = s.id_service
        WHERE c.id_collaborateur = ?
        ORDER BY c.date_creation ASC;
    `;

    try {
        const [rows] = await db.execute(query, [collaborateurId]);
        res.json(rows);
    } catch (error) {
        console.error("Erreur lors de la récupération des commentaires :", error);
        res.status(500).send("Erreur serveur");
    }
});

app.get('/api/materiels/filter', async (req, res) => {
    const { id_type } = req.query;

    if (!id_type) {
        return res.status(400).send('ID type manquant.');
    }

    try {
        const query = `
            SELECT 
                materiels.id_materiel,
                materiels.marque,
                materiels.modele,
                materiels.num_serie,
                materiels.date_remise,
                materiels.date_rendu,
                types_materiels.nom_type
            FROM materiels
            LEFT JOIN types_materiels ON materiels.id_type = types_materiels.id_type
            WHERE materiels.id_type = ?
        `;
        const [results] = await db.execute(query, [id_type]);
        res.json(results);
    } catch (error) {
        console.error('Erreur lors du filtrage des matériels :', error);
        res.status(500).send('Erreur serveur.');
    }
});

// Récupérer les marques uniques de la table materiels
app.get('/api/materiels/marques', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT marque
            FROM materiels
            WHERE marque IS NOT NULL
        `;
        const [results] = await db.execute(query);
        console.log('Résultats des marques :', results); // Log les résultats
        res.json(results.map(row => row.marque));
    } catch (error) {
        console.error('Erreur lors de la récupération des marques :', error);
        res.status(500).send('Erreur serveur.');
    }
});

// Récupérer l'historique d'un matériel
app.get('/api/materiels/:id/historique', async (req, res) => {
    const materielId = req.params.id;

    try {
        const query = `
            SELECT 
                h.id_materiel,
                h.id_collaborateur,
                c.nom AS collaborateur_nom,
                c.prenom AS collaborateur_prenom,
                h.date_remise,
                h.date_rendu,
                h.perdu,
                s_remise.nom AS service_remise_nom,
                s_rendu.nom AS service_rendu_nom
            FROM historique h
            LEFT JOIN collaborateurs c ON h.id_collaborateur = c.id_collaborateur
            LEFT JOIN responsables r_remise ON h.id_responsable_remise = r_remise.id_responsable
            LEFT JOIN services s_remise ON r_remise.id_service = s_remise.id_service
            LEFT JOIN responsables r_rendu ON h.id_responsable_rendu = r_rendu.id_responsable
            LEFT JOIN services s_rendu ON r_rendu.id_service = s_rendu.id_service
            WHERE h.id_materiel = ?;
        `;

        const [results] = await db.execute(query, [materielId]);
        res.json(results);
    } catch (err) {
        console.error('Erreur lors de la récupération de l\'historique :', err);
        res.status(500).send('Erreur serveur.');
    }
});



// Ajouter un nouveau commentaire ou une réponse
app.post('/api/collaborateur/:id/commentaires', async (req, res) => {
    const collaborateurId = req.params.id;
    const { id_responsable, contenu, reponse_a } = req.body;

    if (!contenu || !id_responsable) {
        return res.status(400).send('Le contenu et l\'ID responsable sont obligatoires.');
    }

    try {
        // Si reponse_a est défini, vérifier qu'il pointe vers un commentaire existant
        if (reponse_a) {
            const [parentComment] = await db.execute(
                'SELECT id_commentaire FROM commentaires WHERE id_commentaire = ?',
                [reponse_a]
            );
            if (parentComment.length === 0) {
                return res.status(400).send('Le commentaire parent spécifié n\'existe pas.');
            }
        }

        const query = `
            INSERT INTO commentaires (id_collaborateur, id_responsable, contenu, date_creation, reponse_a)
            VALUES (?, ?, ?, NOW(), ?)
        `;
        await db.execute(query, [collaborateurId, id_responsable, contenu, reponse_a || null]);
        res.status(201).send('Commentaire ou réponse ajouté avec succès.');
    } catch (err) {
        console.error('Erreur lors de l\'ajout du commentaire :', err);
        res.status(500).send('Erreur serveur.');
    }
});


// Supprimer un commentaire
app.put('/api/commentaires/:id/supprimer', async (req, res) => {
    const commentaireId = req.params.id;

    try {
        // Mettre à jour le commentaire pour le marquer comme supprimé
        await db.execute(
            `UPDATE commentaires SET supprime = TRUE WHERE id_commentaire = ?`,
            [commentaireId]
        );

        res.send('Commentaire marqué comme supprimé avec succès.');
    } catch (err) {
        console.error('Erreur lors de la suppression logique du commentaire :', err);
        res.status(500).send('Erreur serveur.');
    }
});



// Route pour récupérer les détails d'un commentaire
app.get('/api/commentaires/:id', async (req, res) => {
    const commentaireId = req.params.id;

    try {
        const [results] = await db.execute(
            'SELECT id_commentaire, likes FROM commentaires WHERE id_commentaire = ?',
            [commentaireId]
        );

        if (results.length === 0) {
            return res.status(404).json({ message: 'Commentaire introuvable' });
        }

        res.json(results[0]); // Renvoie le commentaire avec les likes actualisés
    } catch (error) {
        console.error('Erreur lors de la récupération du commentaire:', error);
        res.status(500).send('Erreur serveur.');
    }
});


// Ajouter ou retirer un like sur un commentaire
app.post('/api/commentaires/:id/toggle-like', async (req, res) => {
    const commentaireId = req.params.id;
    const idResponsable = req.body.id_responsable;

    if (!idResponsable) {
        return res.status(400).send('ID responsable manquant.');
    }

    try {
        // Vérifier si le like existe déjà
        const [existingLike] = await db.execute(
            'SELECT * FROM likes WHERE id_commentaire = ? AND id_responsable = ?',
            [commentaireId, idResponsable]
        );

        let isLiked;

        if (existingLike.length > 0) {
            // Supprimer le like
            await db.execute(
                'DELETE FROM likes WHERE id_commentaire = ? AND id_responsable = ?',
                [commentaireId, idResponsable]
            );

            // Décrémenter le compteur de likes
            await db.execute(
                'UPDATE commentaires SET likes = likes - 1 WHERE id_commentaire = ?',
                [commentaireId]
            );
            isLiked = false;
        } else {
            // Ajouter un like
            await db.execute(
                'INSERT INTO likes (id_commentaire, id_responsable) VALUES (?, ?)',
                [commentaireId, idResponsable]
            );

            // Incrémenter le compteur de likes
            await db.execute(
                'UPDATE commentaires SET likes = likes + 1 WHERE id_commentaire = ?',
                [commentaireId]
            );
            isLiked = true;
        }

        // Récupérer le nombre total de likes
        const [updatedLikes] = await db.execute(
            'SELECT likes FROM commentaires WHERE id_commentaire = ?',
            [commentaireId]
        );

        if (updatedLikes.length === 0) {
            return res.status(404).send('Commentaire introuvable.');
        }

        const totalLikes = updatedLikes[0].likes;

        // Réponse avec le nouvel état
        res.status(200).json({ likes: totalLikes, isLiked });
    } catch (error) {
        console.error('Erreur lors du toggle-like:', error);
        res.status(500).send('Erreur serveur.');
    }
});

// Route pour récupérer les commentaires likés par un utilisateur
app.get('/api/responsable/:idResponsable/likes', async (req, res) => {
    try {
        // Récupérer l'ID du responsable depuis les paramètres
        const idResponsable = req.params.idResponsable;

        // Valider l'ID du responsable
        if (!idResponsable) {
            return res.status(400).json({ error: 'ID du responsable requis.' });
        }

        // Requête SQL pour récupérer les commentaires likés par ce responsable
        const query = `
            SELECT id_commentaire 
            FROM likes 
            WHERE id_responsable = ?;
        `;

        // Exécuter la requête
        const [rows] = await db.execute(query, [idResponsable]);

        // Extraire les ID des commentaires likés
        const likedComments = rows.map(row => row.id_commentaire);

        // Répondre avec les ID des commentaires likés
        res.status(200).json(likedComments);
    } catch (error) {
        console.error('Erreur lors de la récupération des likes:', error);
        res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
});


// Mettre à jour un commentaire
app.put('/api/commentaires/:id', async (req, res) => {
    const commentaireId = req.params.id;
    const { contenu } = req.body;

    if (!contenu) {
        return res.status(400).send('Le contenu est obligatoire.');
    }

    try {
        // Mettre à jour le commentaire
        await db.execute(
            'UPDATE commentaires SET contenu = ?, date_modification = NOW() WHERE id_commentaire = ?',
            [contenu, commentaireId]
        );

        // Récupérer le commentaire mis à jour
        const [updatedComment] = await db.execute(
            'SELECT id_commentaire, contenu, date_creation, date_modification FROM commentaires WHERE id_commentaire = ?',
            [commentaireId]
        );

        if (updatedComment.length === 0) {
            return res.status(404).send('Commentaire introuvable.');
        }

        // Retourner le commentaire mis à jour en JSON
        res.status(200).json(updatedComment[0]);
    } catch (error) {
        console.error('Erreur lors de la mise à jour du commentaire :', error);
        res.status(500).send('Erreur serveur.');
    }
});

app.put('/api/materiels/:id', async (req, res) => {
    const materielId = req.params.id;
    const { marque, modele, num_serie, id_type } = req.body;

    if (!marque || !modele || !num_serie || !id_type) {
        return res.status(400).send('Tous les champs sont obligatoires.');
    }

    try {
        const query = `
            UPDATE materiels
            SET marque = ?, modele = ?, num_serie = ?, id_type = ?
            WHERE id_materiel = ?
        `;
        await db.execute(query, [marque, modele, num_serie, id_type, materielId]);
        res.status(200).send('Matériel mis à jour avec succès.');
    } catch (error) {
        console.error('Erreur lors de la mise à jour du matériel :', error);
        res.status(500).send('Erreur serveur.');
    }
});


// Route pour récupérer les services ayant liké un commentaire
app.get('/api/commentaires/:id/likes', async (req, res) => {
    const commentaireId = req.params.id;

    try {
        const query = `
            SELECT s.nom AS nom_service
            FROM likes l
            INNER JOIN responsables r ON l.id_responsable = r.id_responsable
            INNER JOIN services s ON r.id_service = s.id_service
            WHERE l.id_commentaire = ?
        `;
        const [results] = await db.execute(query, [commentaireId]);
        res.json(results);
    } catch (err) {
        console.error('Erreur lors de la récupération des likes :', err);
        res.status(500).send('Erreur serveur.');
    }
});

app.get('/api/services', async (req, res) => {
    try {
        const query = `SELECT DISTINCT nom FROM services ORDER BY nom ASC;`;
        const [services] = await db.execute(query);
        res.json(services.map(service => service.nom));
    } catch (error) {
        console.error('Erreur lors de la récupération des services :', error);
        res.status(500).send('Erreur serveur.');
    }
});


// === Authentification ===
// Vérification des identifiants
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    const query = `
        SELECT responsables.id_responsable, responsables.id_service, services.nom AS service
        FROM responsables
        LEFT JOIN services ON responsables.id_service = services.id_service
        WHERE responsables.identifiant = ? AND responsables.mot_de_passe = ?
    `;

    try {
        const [results] = await db.execute(query, [username, password]);
        if (results.length > 0) {
            const user = results[0];
            const isAdmin = user.id_service === 5 || user.id_service === 6;
            res.json({ success: true, id_responsable: user.id_responsable, isAdmin, id_service: user.id_service });
        } else {
            res.status(401).json({ success: false, message: 'Identifiant ou mot de passe incorrect' });
        }
    } catch (err) {
        console.error('Erreur lors de la connexion :', err);
        res.status(500).send('Erreur serveur');
    }
});

/* ===== STATIC FILES & ROUTES ===== */
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'login.html'));
});

app.get('/accueil', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'accueil.html'));
});

app.get('/collaborateur', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'collaborateur.html'));
});

/* ===== SERVER START ===== */
app.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
});

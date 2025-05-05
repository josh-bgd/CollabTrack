const express = require('express');
const path = require('path');
const db = require('./config/db'); // Pool de connexions
const session = require('express-session'); // 🔥 Ajout de express-session

const app = express();
app.use(express.json());

// 🔹 Configuration des sessions
app.use(session({
    secret: 'superSecretKey', // 🔒 Change cette clé pour + de sécurité en prod
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // 🚀 Passer à "true" en production (HTTPS)
}));

const PORT = 3000;

/* ===== API ROUTES ===== */

// === Collaborateurs ===
// Récupérer la liste des collaborateurs
app.get('/api/collaborateurs', async (req, res) => {
    try {
        const { serviceId } = req.query; // 🔍 Récupérer le paramètre serviceId

        let query = `
            SELECT 
                collaborateurs.id_collaborateur, 
                collaborateurs.nom, 
                collaborateurs.prenom, 
                collaborateurs.activated,
                collaborateurs.gardien,
                services.nom AS service,
                services.id_service AS id_service
            FROM collaborateurs
            LEFT JOIN services ON collaborateurs.id_service = services.id_service
        `;

        let params = [];

        if (serviceId) {
            query += ` WHERE collaborateurs.id_service = ?`;  // ✅ Filtrer si serviceId fourni
            params.push(serviceId);
        }

        console.log("📢 Requête exécutée :", query, params);  // Debugging SQL

        const [results] = await db.execute(query, params);

        res.json(results);
    } catch (err) {
        console.error('❌ Erreur lors de la récupération des collaborateurs :', err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

app.put('/api/collaborateurs/:id', async (req, res) => {
    const { id } = req.params;
    const { prenom, nom } = req.body;

    if (!prenom || !nom) {
        return res.status(400).json({ error: "Prénom et Nom sont obligatoires." });
    }

    try {
        const query = `UPDATE collaborateurs SET prenom = ?, nom = ? WHERE id_collaborateur = ?`;
        await db.execute(query, [prenom, nom, id]);

        res.status(200).json({ message: "Collaborateur mis à jour avec succès." });
    } catch (err) {
        console.error("❌ Erreur lors de la mise à jour :", err);
        res.status(500).json({ error: "Erreur serveur", details: err.message });
    }
});


app.get('/api/service/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `SELECT nom FROM services WHERE id_service = ?`;
        const [results] = await db.execute(query, [id]);

        if (results.length > 0) {
            res.json({ nom: results[0].nom });
        } else {
            res.status(404).json({ error: "Service non trouvé" });
        }
    } catch (err) {
        console.error('Erreur lors de la récupération du service :', err);
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

// ❌ Suppression complète d'un matériel
app.delete('/api/materiels/:id', async (req, res) => {
    const materielId = req.params.id;

    try {
        // Supprimer les entrées liées dans `historique`
        await db.execute('DELETE FROM historique WHERE id_materiel = ?', [materielId]);

        // Supprimer le matériel de la table `materiels`
        const [result] = await db.execute('DELETE FROM materiels WHERE id_materiel = ?', [materielId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Matériel non trouvé.' });
        }

        res.status(200).json({ message: 'Matériel supprimé avec succès.' });
    } catch (error) {
        console.error('❌ Erreur lors de la suppression du matériel :', error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});


// === Commentaires ===
// Récupérer tous les commentaires d'un collaborateur avec les réponses
app.get('/api/collaborateur/:id/commentaires', async (req, res) => {
    const collaborateurId = req.params.id;
    const { id_materiel } = req.query;

    try {
        console.log(`🔍 Récupération des commentaires pour collaborateur ${collaborateurId}, id_materiel=${id_materiel}`);

        let query = `
            SELECT c.id_commentaire, c.contenu, c.date_creation, c.date_modification, 
                   c.id_responsable, c.id_materiel, c.reponse_a, c.likes, c.supprime,
                   s.nom AS service_nom
            FROM commentaires c
            LEFT JOIN responsables r ON c.id_responsable = r.id_responsable
            LEFT JOIN services s ON r.id_service = s.id_service
            WHERE c.id_collaborateur = ?
        `;

        let params = [collaborateurId];

        if (id_materiel !== undefined && id_materiel !== "null") {
            query += ` AND c.id_materiel = ?`;
            params.push(id_materiel);
        } else {
            query += ` AND (c.id_materiel IS NULL OR c.id_materiel = '')`;
        }

        query += ` ORDER BY c.date_creation DESC`;

        const [commentaires] = await db.execute(query, params);
        console.log("✅ Commentaires récupérés :", commentaires);

        res.json(commentaires);
    } catch (err) {
        console.error("❌ Erreur lors de la récupération des commentaires :", err);
        res.status(500).json({ error: "Erreur serveur", details: err.message });
    }
});

app.post('/api/materiels', async (req, res) => {
    console.log("📥 Requête reçue par le serveur :", req.method, req.headers['content-type'], req.body);

    const { marque, modele, numSerie, id_type, etat } = req.body; 

    if (!modele || !marque || !etat || !id_type) { 
        console.error("🚨 ERREUR : Champ obligatoire manquant !");
        return res.status(400).json({ error: "Modèle, marque, état et type sont obligatoires." });
    }

    try {
        const query = `
            INSERT INTO materiels (modele, marque, num_serie, etat, id_type)
            VALUES (?, ?, ?, ?, ?)
        `;
        await db.execute(query, [modele, marque, numSerie || null, etat, id_type]);
        console.log("✅ Matériel inséré avec succès !");
        res.status(201).json({ message: "Matériel ajouté avec succès." });
    } catch (err) {
        console.log("📌 Types côté serveur :");
        console.log("Modele :", modele, "| Type :", typeof modele);
        console.log("Marque :", marque, "| Type :", typeof marque);
        console.log("Num Série :", numSerie, "| Type :", typeof numSerie);
        console.log("État :", etat, "| Type :", typeof etat);
        console.log("ID Type :", id_type, "| Type :", typeof id_type);
        console.error("❌ Erreur lors de l'ajout du matériel :", err);
        res.status(500).json({ error: "Erreur serveur", details: err.message });
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

// ✅ API pour récupérer l'ID d'un service à partir de son nom
app.get('/api/service/name/:serviceName', async (req, res) => {
    const serviceName = req.params.serviceName;
    
    try {
        // 🔍 Récupérer l'ID du service correspondant au nom
        const [service] = await db.execute(
            `SELECT id_service FROM services WHERE nom = ?`, 
            [serviceName]
        );

        if (service.length === 0) {
            return res.status(404).json({ error: "Service non trouvé." });
        }

        res.json(service[0]); // Retourne { id_service: X }
    } catch (error) {
        console.error("❌ Erreur lors de la récupération du service par nom :", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

// Ajouter un commentaire avec gestion des mentions
app.post('/api/collaborateur/:id/commentaires', async (req, res) => {
    const collaborateurId = req.params.id;
    const { id_responsable, contenu, reponse_a, id_materiel, mentioned_service } = req.body;

    if (!contenu || !id_responsable) {
        return res.status(400).send("Le contenu et l'ID responsable sont obligatoires.");
    }

    try {
        console.log(`📥 Requête reçue : collaborateurId=${collaborateurId}, id_materiel=${id_materiel || "NULL"}`);

        // 🔹 Insérer le commentaire avec prise en charge de l'ID matériel
        const query = `
            INSERT INTO commentaires (id_collaborateur, id_responsable, contenu, date_creation, reponse_a, id_materiel)
            VALUES (?, ?, ?, NOW(), ?, ?)
        `;
        const [result] = await db.execute(query, [
            collaborateurId, 
            id_responsable, 
            contenu, 
            reponse_a || null, 
            id_materiel !== undefined ? id_materiel : null // ✅ Conversion explicite
        ]);
        const insertedCommentId = result.insertId;

        console.log(`✅ Commentaire inséré avec ID ${insertedCommentId}, id_materiel=${id_materiel || "NULL"}`);

        // 🔹 Vérifier si un service est mentionné
        if (mentioned_service) {
            console.log(`📢 Service mentionné détecté: ${mentioned_service}`);
            
            // 🔎 Trouver l'ID du service en base de données
            const [serviceData] = await db.execute(
                'SELECT id_service FROM services WHERE nom = ? LIMIT 1',
                [mentioned_service]
            );

            if (serviceData.length > 0) {
                const serviceId = serviceData[0].id_service;

                // 🔎 Trouver tous les responsables du service
                const [responsables] = await db.execute(
                    'SELECT id_responsable FROM responsables WHERE id_service = ?',
                    [serviceId]
                );

                if (responsables.length > 0) {
                    for (const responsable of responsables) {
                        const typeNotification = 0; // 0 = Mention

                        // ✅ Ajouter une notification pour chaque responsable du service
                        await db.execute(
                            `INSERT INTO notifications (id_responsable, id_commentaire, type_notification, date_creation, vu) 
                             VALUES (?, ?, ?, NOW(), 0)`,
                             [responsable.id_responsable, insertedCommentId, typeNotification]
                        );
                    }
                    console.log(`✅ Notification envoyée à ${responsables.length} responsables du service ${mentioned_service}`);
                } else {
                    console.log(`❌ Aucun responsable trouvé pour le service "${mentioned_service}"`);
                }
            } else {
                console.log(`❌ Service mentionné "${mentioned_service}" non trouvé.`);
            }
        }

        res.status(201).send('Commentaire ajouté avec succès.');
    } catch (err) {
        console.error("❌ Erreur lors de l'ajout du commentaire :", err);
        res.status(500).json({ error: "Erreur serveur", details: err.message });
    }
});


// Supprimer un commentaire
app.put('/api/commentaires/:id/supprimer', async (req, res) => {
    const commentaireId = req.params.id;

    try {
        await db.execute(
            `UPDATE commentaires SET supprime = TRUE WHERE id_commentaire = ?`,
            [commentaireId]
        );
        res.send('Commentaire marqué comme supprimé avec succès.');
    } catch (err) {
        console.error('Erreur lors de la suppression du commentaire :', err);
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

        // Récupérer les détails du commentaire
        const [updatedComment] = await db.execute(
            `SELECT c.likes, c.contenu, r.id_service AS service_commentaire, c.id_responsable
            FROM commentaires c
            LEFT JOIN responsables r ON c.id_responsable = r.id_responsable
            WHERE c.id_commentaire = ?`,
            [commentaireId]
        );

        if (updatedComment.length === 0) {
            return res.status(404).send('Commentaire introuvable.');
        }

        const totalLikes = updatedComment[0].likes;
        const commentContent = updatedComment[0].contenu;
        const serviceCommentaire = updatedComment[0].service_commentaire;
        const ownerId = updatedComment[0].id_responsable;

        // Vérifier si l'utilisateur est propriétaire du commentaire
        const isOwner = ownerId === parseInt(idResponsable);

        // Vérifier si le service a été mentionné
        const isMentioned = commentContent.includes(`@${serviceCommentaire}`);

        // Vérifier si le commentaire fait partie d'une discussion avec cet utilisateur
        const [discussionCheck] = await db.execute(
            `SELECT COUNT(*) AS count FROM commentaires WHERE reponse_a = ? AND id_responsable = ?`,
            [commentaireId, idResponsable]
        );

        const isInDiscussion = discussionCheck[0].count > 0;

        console.log("📌 Réponse du toggle-like:", {
            likes: totalLikes,
            isLiked,
            comment_contenu: commentContent,
            service_commentaire: serviceCommentaire,
            isOwner,
            isMentioned,
            isInDiscussion
        });

        res.status(200).json({
            likes: totalLikes,
            isLiked,
            comment_contenu: commentContent,
            service_commentaire: serviceCommentaire,
            isOwner,
            isMentioned,
            isInDiscussion
        });

    } catch (error) {
        console.error('❌ Erreur lors du toggle-like:', error);
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

app.post('/api/materiels', async (req, res) => {
    const { marque, modele, num_serie, etat, id_type } = req.body;

    if (!marque || !modele || !num_serie || !etat || !id_type) {
        return res.status(400).send('Tous les champs sont obligatoires.');
    }

    try {
        const query = `
            INSERT INTO materiels (marque, modele, num_serie, etat, id_type)
            VALUES (?, ?, ?, ?)
        `;
        await db.execute(query, [marque, modele, num_serie, etat, id_type]);
        res.status(201).send('Matériel ajouté avec succès.');
    } catch (error) {
        console.error('Erreur lors de l\'ajout du matériel :', error);
        res.status(500).send('Erreur serveur.');
    }
});

app.post('/api/collaborateurs', async (req, res) => {
    try {
        const { prenom, nom, telephone, id_service, gardien } = req.body;

        // ✅ Vérifier que tous les champs obligatoires sont remplis
        if (!prenom || !nom || !telephone || !id_service) {
            return res.status(400).json({ error: "Tous les champs obligatoires doivent être remplis." });
        }

        // ✅ Insérer le collaborateur dans la base avec `activated = 1`
        const query = `
            INSERT INTO collaborateurs (prenom, nom, telephone, id_service, gardien, activated)
            VALUES (?, ?, ?, ?, ?, 1)
        `;
        await db.execute(query, [prenom, nom, telephone, id_service, gardien || 0]); // Par défaut, gardien = 0

    } catch (err) {
        console.error("❌ Erreur lors de l'ajout du collaborateur :", err);
        res.status(500).json({ error: "Erreur serveur", details: err.message });
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
        const [services] = await db.execute('SELECT id_service, nom FROM services');
        res.json(services); // ✅ Retourne un tableau d'objets { id_service, nom }
    } catch (err) {
        console.error("❌ Erreur lors de la récupération des services :", err);
        res.status(500).json({ error: "Erreur serveur", details: err.message });
    }
});


// ✅ Récupérer les notifications d'un responsable
app.get('/api/notifications', async (req, res) => {
    const id_responsable = req.headers['id-responsable'];

    if (!id_responsable) {
        return res.status(400).json({ message: 'ID responsable requis' });
    }

    try {
        const query = `
            SELECT n.id_notification, n.type_notification, n.date_creation, 
                   n.vu, c.contenu AS commentaire_contenu
            FROM notifications n
            LEFT JOIN commentaires c ON n.id_commentaire = c.id_commentaire
            WHERE n.id_responsable = ?
            ORDER BY n.date_creation DESC;
        `;
        const [rows] = await db.execute(query, [id_responsable]);

        res.json(rows);
    } catch (error) {
        console.error('❌ Erreur lors de la récupération des notifications :', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ✅ Ajouter une notification de mention
app.post('/api/notifications/mention', async (req, res) => {
    const { id_responsable, id_commentaire, mentioned_service } = req.body;

    if (!id_responsable || !id_commentaire || !mentioned_service) {
        return res.status(400).json({ error: 'Données manquantes.' });
    }

    try {
        // Récupérer l'ID du responsable du service mentionné
        const [service] = await db.execute(
            `SELECT id_responsable FROM responsables WHERE service_nom = ?`, 
            [mentioned_service]
        );

        if (!service || service.length === 0) {
            return res.status(404).json({ error: 'Service non trouvé.' });
        }

        const targetResponsable = service[0].id_responsable;

        if (targetResponsable !== id_responsable) {
            await db.execute(`
                INSERT INTO notifications (id_responsable, id_commentaire, type_notification, vu) 
                VALUES (?, ?, ?, 0)
            `, [targetResponsable, id_commentaire, 0]); // 0 = Mention

            return res.json({ success: true });
        }

        res.json({ success: false, message: "Pas de notification nécessaire." });

    } catch (error) {
        console.error('❌ Erreur lors de la création de la notification de mention:', error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

// ✅ Ajouter une notification de like
app.post('/api/notifications/like', async (req, res) => {
    console.log("📥 Données reçues dans la requête :", req.body);
    console.log("🔍 Type de req.body.id_responsable :", typeof req.body.id_responsable, "Valeur :", req.body.id_responsable);

    let { id_responsable, id_commentaire, type_notification, isLiked, mentioned_service } = req.body;

    // ✅ Correction : Conversion explicite en nombre
    id_responsable = parseInt(id_responsable, 10);
    
    console.log("🔍 Type de id_responsable après conversion :", typeof id_responsable, "Valeur :", id_responsable);

    if (!id_responsable || !id_commentaire || type_notification === undefined) {
        return res.status(400).json({ error: 'Données manquantes.' });
    }

    try {
        console.log(`🔍 Vérification du commentaire ID: ${id_commentaire}`);

        // ✅ Récupérer le propriétaire du commentaire
        const [comment] = await db.execute(
            `SELECT id_responsable, contenu FROM commentaires WHERE id_commentaire = ?`, 
            [id_commentaire]
        );

        if (!comment || comment.length === 0) {
            return res.status(404).json({ error: 'Commentaire non trouvé.' });
        }

        const ownerId = comment[0].id_responsable;
        let targetResponsable = ownerId;
        const commentContent = comment[0].contenu;

        console.log("🔍 Type de id_responsable après conversion :", typeof targetResponsable, "Valeur :", targetResponsable);


        // ✅ Vérifier si l'ID responsable existe bien dans la table `responsables`
        const [responsableExists] = await db.execute(
            `SELECT id_responsable FROM responsables WHERE id_responsable = ?`,
            [id_responsable]
        );

        if (responsableExists.length === 0) {
            console.error(`❌ L'ID responsable ${id_responsable} n'existe pas dans la table responsables.`);
            return res.status(400).json({ error: `ID responsable invalide (${id_responsable})` });
        }

        // ✅ Récupérer le service qui like
        const [serviceUser] = await db.execute(
            `SELECT s.nom FROM services s
            INNER JOIN responsables r ON s.id_service = r.id_service
            WHERE r.id_responsable = ?`,
            [id_responsable]
        );

        const serviceLiker = serviceUser.length > 0 ? `@${serviceUser[0].nom}` : "Un utilisateur";

        // ✅ Vérifier si c'est un dislike (like retiré)
        if (!isLiked) {  
            console.log("❌ Dislike détecté, aucune notification envoyée.");
            return res.json({ success: false, message: "Dislike détecté, aucune notification envoyée." });
        }

        // ✅ Insérer la notification pour l'auteur du commentaire
        if (targetResponsable !== id_responsable) {
            await db.execute(
                `INSERT INTO notifications (id_responsable, id_commentaire, type_notification, contenu, vu) 
                VALUES (?, ?, ?, ?, 0)`,
                [targetResponsable, id_commentaire, type_notification, `${serviceLiker} a liké votre commentaire : "${commentContent}"`, 0]
            );
            console.log(`✅ Notification envoyée à l'auteur du commentaire (ID: ${targetResponsable})`);
        }

        console.log(mentioned_service>0);
        // ✅ Si un service est mentionné, récupérer son ID et envoyer une notification
        if (mentioned_service > 0) {
            console.log(`📢 Vérification du service mentionné : ${mentioned_service}`);
            const [mentionedService] = await db.execute(
                `SELECT id_responsable FROM responsables WHERE id_service = (SELECT id_service FROM services WHERE nom = ?)`,
                [mentioned_service]
            );

            if (mentioned_service > 0) {
                const mentionedServiceId = mentionedService[0].id_responsable;
                console.log(`✅ ID du service mentionné trouvé : ${mentionedServiceId}`);
                
                await db.execute(
                    `INSERT INTO notifications (id_responsable, id_commentaire, type_notification, contenu, vu) 
                    VALUES (?, ?, ?, ?, 0)`,
                    [mentionedServiceId, id_commentaire, 0, `${serviceLiker} a liké un commentaire où votre service est mentionné : "${commentContent}"`, 0]
                );
                console.log(`✅ Notification envoyée au service mentionné (ID: ${mentionedServiceId})`);
            } else {
                console.warn(`⚠️ Service mentionné non trouvé : ${mentioned_service}`);
            }
        }

        res.json({ success: true });

    } catch (error) {
        console.error('❌ Erreur SQL lors de la création de la notification de like:', error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});


// ✅ Récupérer les notifications non lues
app.get('/api/notifications/unread', async (req, res) => {
    const idResponsable = req.headers['id-responsable'];
    if (!idResponsable) return res.status(400).send("ID responsable manquant.");

    try {
        const [rows] = await db.execute(
            `SELECT * FROM notifications 
            WHERE id_responsable = ? AND vu = 0 
            ORDER BY date_creation DESC`, 
            [idResponsable]
        );

        res.json(rows);
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des notifications :", error);
        res.status(500).send("Erreur serveur.");
    }
});

// ✅ Marquer toutes les notifications comme lues
app.post('/api/notifications/mark-all-read', async (req, res) => {
    const idResponsable = req.headers['id-responsable'];
    if (!idResponsable) return res.status(400).send("ID responsable manquant.");

    try {
        await db.execute(
            `UPDATE notifications SET vu = 1 WHERE id_responsable = ?`, 
            [idResponsable]
        );
        res.send("Toutes les notifications ont été marquées comme lues.");
    } catch (error) {
        console.error("❌ Erreur lors de la mise à jour des notifications :", error);
        res.status(500).send("Erreur serveur.");
    }
});

// ✅ Marquer une notification spécifique comme lue
app.put('/api/notifications/:id/read', async (req, res) => {
    const idNotification = req.params.id;

    try {
        await db.execute(`UPDATE notifications SET vu = 1 WHERE id_notification = ?`, [idNotification]);
        res.send("Notification marquée comme lue.");
    } catch (error) {
        console.error("❌ Erreur lors de la mise à jour de la notification :", error);
        res.status(500).send("Erreur serveur.");
    }
});

// ✅ Supprimer une notification
app.delete('/api/notifications/:id/delete', async (req, res) => {
    const idNotification = req.params.id;

    try {
        await db.execute(`DELETE FROM notifications WHERE id_notification = ?`, [idNotification]);
        res.send("Notification supprimée.");
    } catch (error) {
        console.error("❌ Erreur lors de la suppression de la notification :", error);
        res.status(500).send("Erreur serveur.");
    }
});

// ✅ Désactiver un collaborateur (mettre activated à 0)
app.put('/api/collaborateurs/:id/desactiver', async (req, res) => {
    try {
        const collaborateurId = req.params.id;
        await db.execute('UPDATE collaborateurs SET activated = 0 WHERE id_collaborateur = ?', [collaborateurId]);

    } catch (err) {
        console.error("❌ Erreur lors de la suppression du collaborateur :", err);
        res.status(500).json({ error: "Erreur serveur", details: err.message });
    }
});

// ✅ Modifier le service d'un collaborateur
app.put('/api/collaborateurs/:id/changer-service', async (req, res) => {
    try {
        const collaborateurId = req.params.id;
        const { id_service } = req.body;

        if (!id_service) {
            return res.status(400).json({ error: "Le nouveau service est obligatoire." });
        }

        await db.execute('UPDATE collaborateurs SET id_service = ? WHERE id_collaborateur = ?', [id_service, collaborateurId]);

        res.status(200).json({ message: "Service du collaborateur mis à jour avec succès !" });
    } catch (err) {
        console.error("❌ Erreur lors du changement de service :", err);
        res.status(500).json({ error: "Erreur serveur", details: err.message });
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

const pool = require('./db');
async function seed() {
    try {
        await pool.query(`
            INSERT IGNORE INTO games (id, time_casa, time_fora, data_jogo, status) VALUES 
            (1, 'Flamengo', 'Palmeiras', '2026-06-15 21:30:00', 'agendado'),
            (2, 'São Paulo', 'Corinthians', '2026-06-16 16:00:00', 'agendado'),
            (3, 'Real Madrid', 'Barcelona', '2026-06-17 15:00:00', 'agendado')
        `);
        console.log('Jogos inseridos com sucesso!');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
seed();

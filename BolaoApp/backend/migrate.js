const pool = require('./db');

async function migrate() {
    try {
        console.log('Migrando banco de dados para Versão 2...');
        
        // Deleta todas as apostas antigas para evitar inconsistências
        await pool.query('DELETE FROM bets');
        
        // Adiciona colunas se não existirem
        try {
            await pool.query('ALTER TABLE bets ADD COLUMN gols_casa INT NOT NULL DEFAULT 0');
            await pool.query('ALTER TABLE bets ADD COLUMN gols_fora INT NOT NULL DEFAULT 0');
        } catch(e) {
            console.log('Colunas de gols já existem ou erro silencioso.');
        }

        // Reseta os jogos
        await pool.query('DELETE FROM games');
        await pool.query(`
            INSERT INTO games (id, time_casa, time_fora, data_jogo, status) VALUES 
            (1, 'Brasil', 'Haiti', '2026-06-19 21:30:00', 'agendado')
        `);

        console.log('Migração concluída com sucesso!');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
migrate();

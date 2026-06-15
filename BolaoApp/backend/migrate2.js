const pool = require('./db');

async function migrate2() {
    try {
        console.log('Migrando banco de dados para Versão 4...');
        
        try {
            await pool.query('ALTER TABLE games ADD COLUMN gols_casa_real INT DEFAULT NULL');
            await pool.query('ALTER TABLE games ADD COLUMN gols_fora_real INT DEFAULT NULL');
        } catch(e) {
            console.log('Colunas de placar real já existem ou erro silencioso.', e.message);
        }

        console.log('Migração 2 concluída com sucesso!');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
migrate2();

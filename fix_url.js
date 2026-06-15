const fs = require('fs');
const path = require('path');

const srcDir = path.join('C:', 'Users', 'jonin', 'OneDrive', 'Documents', 'GitHub', 'BolaoOnline', 'BolaoApp', 'frontend', 'src');
const files = ['Dashboard.jsx', 'Login.jsx', 'Register.jsx', 'Chat.jsx'];

files.forEach(file => {
    const filePath = path.join(srcDir, file);
    if(fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        content = content.replace(/'http:\/\/localhost:5000'/g, "(import.meta.env.VITE_API_URL || 'http://localhost:5000')");
        content = content.replace(/'http:\/\/localhost:5000\/([^']+)'/g, "((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/$1')");
        fs.writeFileSync(filePath, content);
        console.log('Fixed', file);
    }
});

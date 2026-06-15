function pad(str, length) {
    return str.toString().padStart(length, '0');
}

function crc16(payload) {
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) > 0) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc = crc << 1;
            }
        }
    }
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function generatePayload(pixKey, amount, txid = "BOLAO123", merchantName = "Bolao Online", merchantCity = "SAO PAULO") {
    const payloadFormatIndicator = "000201";
    const merchantAccountInformation = `0014br.gov.bcb.pix01${pad(pixKey.length, 2)}${pixKey}`;
    const merchantAccountInformationLength = pad(merchantAccountInformation.length, 2);
    
    const merchantCategoryCode = "52040000";
    const transactionCurrency = "5303986";
    
    const amountStr = amount.toFixed(2);
    const transactionAmount = `54${pad(amountStr.length, 2)}${amountStr}`;
    
    const countryCode = "5802BR";
    const merchantNameField = `59${pad(merchantName.length, 2)}${merchantName}`;
    const merchantCityField = `60${pad(merchantCity.length, 2)}${merchantCity}`;
    
    const additionalDataFieldTemplate = `05${pad(txid.length, 2)}${txid}`;
    const additionalDataFieldLength = pad(additionalDataFieldTemplate.length, 2);
    const additionalData = `62${additionalDataFieldLength}${additionalDataFieldTemplate}`;
    
    let payload = `${payloadFormatIndicator}26${merchantAccountInformationLength}${merchantAccountInformation}${merchantCategoryCode}${transactionCurrency}${transactionAmount}${countryCode}${merchantNameField}${merchantCityField}${additionalData}6304`;
    
    payload += crc16(payload);
    
    return payload;
}

module.exports = {
    generatePayload
};

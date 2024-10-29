const mqtt = require('mqtt');
const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const client  = mqtt.connect('mqtt://192.168.150.12');
const path = require('path');
const crypto = require('crypto');
const devices = 5; // replace 3 with the number of devices you want to simulate


function generateRandomIdExtCapt() {
    return crypto.randomBytes(8).toString('hex').toUpperCase();
}


function generateRandomData(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function generateSensorData(deviceId) {
    let temperatureRange, humidityRange, extTemperatureRange;

    switch(deviceId) {
        case 1:
            temperatureRange = [20, 30];
            humidityRange = [50, 70];
            extTemperatureRange = [15, 25];
            break;
        case 2:
            temperatureRange = [15, 25];
            humidityRange = [30, 50];
            extTemperatureRange = [20, 30];
            break;
        case 3:
            temperatureRange = [25, 35];
            humidityRange = [40, 60];
            extTemperatureRange = [25, 35];
            break;
        default:
            temperatureRange = [20, 30];
            humidityRange = [50, 70];
            extTemperatureRange = [15, 25];
    }
    return {
        capteur_1_data: generateRandomData(...temperatureRange),
        capteur_2_data: generateRandomData(...humidityRange),
        capteur_3_data: generateRandomData(...extTemperatureRange)
    };
}

function generateRandomDate() {
    const start = new Date(2023, 10, 1); // November 1, 2023
    const end = new Date(2023, 11, 1); // December 1, 2023
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

async function configBuilder(id) {
    const configPath = path.join(__dirname, 'conf', `config_boitier_${id}.json`);
    const data = await readFile(configPath, 'utf8');
    const config = JSON.parse(data);
    return config;
}

async function saveConfig(id, config) {
    const configPath = path.join(__dirname, 'conf', `config_boitier_${id}.json`);
    const data = JSON.stringify(config, null, 2);
    await writeFile(configPath, data, 'utf8');
    console.log(`Publishing configuration to MQTT broker:`+data);
    const topic = 'firstco';
    client.publish(topic, data, (err) => {
        if (err) {
            console.error(`Error publishing message: ${err}`);
        }
    });
}


client.on('connect', async function () {
    for(let i = 1; i <= 6; i++) { // start from boitier id 2 to boitier id 6
        try {
            let config = await configBuilder(i);
            config.boitier.id_boitier = i; // set the id
            config.boitier.noSerie = `42301${String(i).padStart(5, '0')}`; // set the noSerie
            config.boitier.activate_date = generateRandomDate(); // set the activate_date
            config.boitier.first_connect = generateRandomDate(); // set the first_connect
            config.boitier.last_connect = generateRandomDate(); // set the last_connect
            config.boitier.last_moved= generateRandomDate(); // set the last_moved
            config.boitier.last_update = generateRandomDate(); // set the last_update
            config.boitier.since_connect = generateRandomDate(); // set the last_update
            config.boitier.ext_capt["1"].id = generateRandomIdExtCapt();
            config.boitier.state= 1; // set the state
            await saveConfig(i, config);
            console.log(`Configuration for boitier id ${i} saved.`);
            
            setInterval(() => {
                const sensorData = generateSensorData(i);
                str_id_boitier = config.boitier.id_boitier + "";
                let topic = "data-"+str_id_boitier// modified topic
                let message = `!${Date.now()},${sensorData.capteur_1_data}|${sensorData.capteur_2_data},${sensorData.capteur_3_data}#`;
                console.log(`Publishing message to topic ${topic}: ${message}`);
                client.publish(topic, message), (err) => {
                    if (err) {
                        console.error(`Error publishing message: ${err}`);
                    }
                }
            }, 1000); // 1000 milliseconds = 1 second
        } catch (err) {
            console.error(err);
        }
    }
});
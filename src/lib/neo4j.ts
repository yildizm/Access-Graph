import neo4j, { Driver } from 'neo4j-driver';

const URI = process.env.NEO4J_URI;
const USER = process.env.NEO4J_USERNAME;
const PASSWORD = process.env.NEO4J_PASSWORD;

if (!URI || !USER || !PASSWORD) {
  throw new Error('Missing Neo4j credentials in .env.local file');
}

const driver: Driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));

export default driver;
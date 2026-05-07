export interface ProcessOption {
  value: string;
  label: string;
}

export const processOptions: ProcessOption[] = [
  { value: 'docker', label: 'Docker' },
  { value: 'redis', label: 'Redis' },
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'mariadb', label: 'MariaDB' },
  { value: 'mongo', label: 'MongoDB' },
  { value: 'sqlservr', label: 'SQL Server' },
  { value: 'oracle', label: 'Oracle DB' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'elasticsearch', label: 'Elasticsearch' },
  { value: 'opensearch', label: 'OpenSearch' },
  { value: 'kafka', label: 'Kafka' },
  { value: 'zookeeper', label: 'Zookeeper' },
  { value: 'rabbitmq', label: 'RabbitMQ' },
  { value: 'nats', label: 'NATS' },
  { value: 'memcached', label: 'Memcached' },
  { value: 'minio', label: 'MinIO' },
  { value: 'localstack', label: 'LocalStack' },
  { value: 'vault', label: 'Vault' },
  { value: 'consul', label: 'Consul' },
  { value: 'keycloak', label: 'Keycloak' },
  { value: 'meilisearch', label: 'Meilisearch' },
  { value: 'typesense', label: 'Typesense' },
  { value: 'mailhog', label: 'MailHog' },
  { value: 'mailpit', label: 'Mailpit' },
  { value: 'nginx', label: 'Nginx' },
  { value: 'apache', label: 'Apache' },
  { value: 'traefik', label: 'Traefik' },
  { value: 'caddy', label: 'Caddy' },
  { value: 'selenium', label: 'Selenium' },
];

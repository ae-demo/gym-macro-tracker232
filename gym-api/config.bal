import ballerina/os;

// Every value the platform injects for the `gym-db` dependency (see
// workload.yaml's envBindings) is read here, once, as a plain configurable —
// never a hardcoded default on the configurable itself. The `final` values
// below layer the sensible defaults the component contract requires, so the
// service starts with no required environment variables at all: unset means
// "talk to a Postgres on localhost with the usual dev credentials", and any
// of the five may be overridden independently.
configurable string gymDbHostEnv = os:getEnv("GYM_DB_HOST");
configurable string gymDbPortEnv = os:getEnv("GYM_DB_PORT");
configurable string gymDbNameEnv = os:getEnv("GYM_DB_DBNAME");
configurable string gymDbUserEnv = os:getEnv("GYM_DB_USER");
configurable string gymDbPasswordEnv = os:getEnv("GYM_DB_PASSWORD");

final string dbHost = gymDbHostEnv == "" ? "localhost" : gymDbHostEnv;
final int dbPort = gymDbPortEnv == "" ? 5432 : check int:fromString(gymDbPortEnv);
final string dbName = gymDbNameEnv == "" ? "gymdb" : gymDbNameEnv;
final string dbUser = gymDbUserEnv == "" ? "postgres" : gymDbUserEnv;
final string dbPassword = gymDbPasswordEnv == "" ? "postgres" : gymDbPasswordEnv;

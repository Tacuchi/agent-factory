test:
	npm test

test-detect-bash:
	node bin/agent-factory.js detect ./test-fixtures/bash-project --json -q

test-detect-node-cli:
	node bin/agent-factory.js detect . --json -q

test-create-dry:
	node bin/agent-factory.js create -n test-agent -r specialist --stack "Bash,Shell" --dry-run -y -q

clean:
	rm -rf /tmp/af-test-*

const path = require('path');
const _ = require('lodash');
const fs = require('fs');

class FullStack {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.provider = 'aws';
    this.aws = this.serverless.getProvider(this.provider);

    this.commands = {
      deploy: {
        lifecycleEvents: [
          'resources',
          'functions'
        ]
      },
      client: {
        usage: 'Generate and deploy clients',
        lifecycleEvents: [
          'client',
          'deploy'
        ],
        commands: {
          config: {
            usage: 'Configure client by executing config script.',
            lifecycleEvents: [
              'config'
            ]
          },
        }
      }
    };


    this.hooks = {
      'client:config:config': () => {
        this.serverless.cli.log('Running client configuration.');
        return this._configureClient();
      },
      'after:aws:deploy:finalize:cleanup': () => {
        // Run client config and deploy after services have deployed.
        this.serverless.cli.log('Running client configuration.');
        this._configureClient();
        let deployWithService = _.get(this.serverless, 'service.custom.client.deployWithService');
        if (deployWithService) {
          return this.serverless.pluginManager.spawn('client:deploy');
        }
      },
      'after:remove:remove': () => {
        // Remove client
        let deployWithService = _.get(this.serverless, 'service.custom.client.deployWithService');
        if (deployWithService) {
          this.serverless.cli.log('Removing client');
          return this.serverless.pluginManager.spawn('client:remove');
        }
      },
    };
  }

  // Hook handlers

  _configureClient() {
    let configurationScript = _.get(this.serverless, 'service.custom.client.configurationScript');
    let configPath = path.join(this.serverless.config.servicePath, configurationScript);
    if (configurationScript !== null && configurationScript !== undefined) {
      this.serverless.cli.log(`Executing config script ${configurationScript}`);
      let config = require(`${configPath}`);
      config(this.serverless);
    } else {
      this.serverless.cli.log('No configutation script defined.');
    }
  }
}

module.exports = FullStack;

pipeline {
    agent any

    // Optional environment variables if Jenkins needs to know where Bun is installed
    // environment {
    //     PATH = "${env.PATH}:/home/jenkins/.bun/bin"
    // }

    stages {
        stage('Checkout') {
            steps {
                // This downloads your latest code from Git
                checkout scm
            }
        }

        stage('Install') {
            steps {
                // Install all the required packages using Bun
                sh 'bun install'
            }
        }

        stage('Quality Checks') {
            steps {
                // Check for syntax and typing errors
                sh 'bun run lint'
                sh 'bun run typecheck'
            }
        }

        stage('Test') {
            steps {
                // Run all integration tests
                sh 'bun test'
            }
        }

        stage('Build') {
            steps {
                // Package the frontend and backend into standalone apps
                sh 'bun run build'
            }
        }

        stage('Package') {
            steps {
                sh '''
                    set -e
                    echo "Packaging frontend..."
                    tar -czf frontend.tar.gz -C frontend/out .
                    
                    echo "Packaging backend..."
                    tar -czf backend.tar.gz -C backend/.next/standalone/backend .
                '''
                archiveArtifacts artifacts: '*.tar.gz', fingerprint: true
            }
        }

        stage('Deploy') {
            steps {
                // IMPORTANT: You must add an SSH Credential in Jenkins named 'production-server-key'
                // and replace 'ubuntu@your.server.com' with your actual server IP or domain.
                sshagent(['production-server-key']) {
                    sh '''
                        set -e
                        DEPLOY_USER="ubuntu"
                        DEPLOY_HOST="your.server.com"
                        APP_NAME="hackmitten"
                        
                        echo "Uploading artifacts..."
                        scp -o StrictHostKeyChecking=no frontend.tar.gz ${DEPLOY_USER}@${DEPLOY_HOST}:/tmp/
                        scp -o StrictHostKeyChecking=no backend.tar.gz ${DEPLOY_USER}@${DEPLOY_HOST}:/tmp/

                        echo "Deploying on server..."
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_HOST} "
                            set -e
                            
                            # Create versioned release directory based on timestamp
                            RELEASE_DIR=/opt/${APP_NAME}/releases/\\$(date +%Y%m%d-%H%M%S)
                            
                            mkdir -p \\$RELEASE_DIR/frontend
                            mkdir -p \\$RELEASE_DIR/backend
                            
                            tar -xzf /tmp/frontend.tar.gz -C \\$RELEASE_DIR/frontend
                            tar -xzf /tmp/backend.tar.gz -C \\$RELEASE_DIR/backend
                            
                            # Create the parent directories for symlinks just in case
                            mkdir -p /opt/${APP_NAME}/frontend
                            mkdir -p /opt/${APP_NAME}/backend
                            
                            # Switch the current symlinks to point to the new release
                            ln -sfn \\$RELEASE_DIR/frontend /opt/${APP_NAME}/frontend/current
                            ln -sfn \\$RELEASE_DIR/backend /opt/${APP_NAME}/backend/current
                            
                            # Restart systemd services
                            sudo systemctl restart hackmitten-frontend
                            sudo systemctl restart hackmitten-backend
                            
                            rm -f /tmp/frontend.tar.gz /tmp/backend.tar.gz
                        "
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'SUCCESS: The code is perfectly built and tested!'
        }
        failure {
            echo 'FAILED: There is a bug or typo in the code. Please fix it and push again.'
        }
    }
}

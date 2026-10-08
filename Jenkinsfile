pipeline {
    agent any

    stages {

        stage('Clean Workspace') {
            steps {
                echo 'Cleaning Jenkins workspace...'
                deleteDir()
            }
        }

        stage('Checkout') {
            steps {
                echo 'Checking out source code...'
                checkout scm
            }
        }

        stage('Install') {
            steps {
                echo 'Installing dependencies...'
                sh 'bun install'
            }
        }

        stage('Quality Checks') {
            steps {
                echo 'Running lint...'
                sh 'bun run lint'

                echo 'Running typecheck...'
                sh 'bun run typecheck'
            }
        }

        stage('Test') {
            steps {
                echo 'Running tests...'
                sh 'bun test'
            }
        }

        stage('Build') {
            steps {
                echo 'Building frontend and backend...'
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

                    echo "Generated artifacts:"
                    ls -lh frontend.tar.gz backend.tar.gz
                '''

                archiveArtifacts artifacts: '*.tar.gz', fingerprint: true
            }
        }

        stage('Deploy') {
            steps {
                 sh '''
                    
                    echo "Deployment"
                    
                '''
            }
        }
    }

    post {
        success {
            echo 'SUCCESS: Build, package and deployment completed successfully!'
        }

        failure {
            echo 'FAILED: Pipeline failed. Check the stage logs for details.'
        }

        always {
            echo 'Complete..'
            
        }
    }
}

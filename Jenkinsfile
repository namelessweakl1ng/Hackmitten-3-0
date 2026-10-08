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

        stage('Deploy') {
            steps {
                // Your maintainer can add server restart commands here later.
                // For now, it just prints a success message.
                echo 'Ready for the maintainer to deploy to the server!'
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

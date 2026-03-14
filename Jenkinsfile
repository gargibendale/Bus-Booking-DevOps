pipeline {
    agent any

    environment {
        // Workspace inside Jenkins
        WORKSPACE_DIR = "${env.WORKSPACE}"
    }

    stages {

        stage('Checkout') {
            steps {
                echo "Checking out source code from Git..."
                checkout scm
            }
        }

        stage('Debug') {
    steps {
        sh 'ls -la ${WORKSPACE}/terraform'
    }
}

        stage('Infrastructure Security Scan') {
            steps {
                echo "Running Trivy security scan on Terraform files..."
                script {
                    // Mount the terraform folder directly into the Trivy container
                   sh '''
docker run --rm \
    -u $(id -u):$(id -g) \
    -v ${WORKSPACE}/terraform:/terraform \
    aquasec/trivy:latest config --severity HIGH,CRITICAL --format table /terraform
'''
                }
            }
        }

        stage('Terraform Init & Plan') {
            steps {
                echo "Initializing Terraform and creating plan..."
                script {
                    // Mount the terraform folder directly and set working directory to /terraform
                    sh '''
        docker run --rm \
            -u $(id -u):$(id -g) \
            -v ${WORKSPACE}/terraform:/terraform \
            -w /terraform \
            hashicorp/terraform:latest init

        docker run --rm \
            -u $(id -u):$(id -g) \
            -v ${WORKSPACE}/terraform:/terraform \
            -w /terraform \
            hashicorp/terraform:latest plan
        '''
                }
            }
        }
    }

    post {
        always {
            echo "Pipeline finished. Check the console output and reports."
        }
        failure {
            echo "❌ Pipeline failed. Review Trivy scan or Terraform plan for issues."
        }
        success {
            echo "✅ Pipeline completed successfully!"
        }
    }
}
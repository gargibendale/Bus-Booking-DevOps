pipeline {
    agent any

    environment {
        // This is the host path passed in from docker-compose
        HOST_WORKSPACE = "${env.HOST_WORKSPACE}/${env.JOB_NAME}"
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
                // Verify both paths so you can compare
                sh 'echo "Jenkins path: ${WORKSPACE}"'
                sh 'echo "Host path: ${HOST_WORKSPACE}"'
                sh 'ls -la ${WORKSPACE}/terraform'
            }
        }

        stage('Infrastructure Security Scan') {
            steps {
                echo "Running Trivy security scan on Terraform files..."
                script {
                    sh '''
docker run --rm \
    -v ${HOST_WORKSPACE}/terraform:/terraform \
    aquasec/trivy:latest config --severity HIGH,CRITICAL --format table /terraform
'''
                }
            }
        }

        stage('Terraform Init & Plan') {
            steps {
                echo "Initializing Terraform and creating plan..."
                withCredentials([
    string(credentialsId: 'TF_VAR_github_pat',        variable: 'GITHUB_PAT'),
    string(credentialsId: 'TF_VAR_db_host',           variable: 'DB_HOST'),
    string(credentialsId: 'TF_VAR_postgres_user',     variable: 'POSTGRES_USER'),
    string(credentialsId: 'TF_VAR_postgres_password', variable: 'POSTGRES_PASSWORD'),
    string(credentialsId: 'TF_VAR_secret_key',        variable: 'SECRET_KEY'),
    string(credentialsId: 'TF_VAR_trusted_ssh_cidr',  variable: 'TRUSTED_SSH_CIDR'),
    string(credentialsId: 'AWS_ACCESS_KEY_ID',        variable: 'AWS_ACCESS_KEY_ID'),
    string(credentialsId: 'AWS_SECRET_ACCESS_KEY',    variable: 'AWS_SECRET_ACCESS_KEY')
]) {
                script {
                   sh '''
docker run --rm \
    -v ${HOST_WORKSPACE}/terraform:/terraform \
    -w /terraform \
    -e AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID} \
    -e AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY} \
    hashicorp/terraform:latest init

docker run --rm \
    -v ${HOST_WORKSPACE}/terraform:/terraform \
    -w /terraform \
    -e AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID} \
    -e AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY} \
    hashicorp/terraform:latest plan \
    -var "github_pat=${GITHUB_PAT}" \
    -var "db_host=${DB_HOST}" \
    -var "postgres_user=${POSTGRES_USER}" \
    -var "postgres_password=${POSTGRES_PASSWORD}" \
    -var "secret_key=${SECRET_KEY}" \
    -var "algorithm=HS256" \
    -var "access_token_expire_minutes=150" \
    -var "postgres_db=busapp" \
    -var "trusted_ssh_cidr=${TRUSTED_SSH_CIDR}"
'''
                }
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
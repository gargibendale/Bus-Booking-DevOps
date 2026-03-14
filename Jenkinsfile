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
            string(credentialsId: 'TF_VAR_github_pat',            secretVariable: 'TF_VAR_github_pat'),
            string(credentialsId: 'TF_VAR_secret_key',            secretVariable: 'TF_VAR_secret_key'),
            string(credentialsId: 'TF_VAR_db_host',               secretVariable: 'TF_VAR_db_host'),
            string(credentialsId: 'TF_VAR_postgres_db',           secretVariable: 'TF_VAR_postgres_db'),
            string(credentialsId: 'TF_VAR_postgres_user',         secretVariable: 'TF_VAR_postgres_user'),
            string(credentialsId: 'TF_VAR_postgres_password',     secretVariable: 'TF_VAR_postgres_password'),
            string(credentialsId: 'TF_VAR_algorithm',             secretVariable: 'TF_VAR_algorithm'),
            string(credentialsId: 'TF_VAR_access_token_expire_minutes', secretVariable: 'TF_VAR_access_token_expire_minutes'),
        ]) {
            script {
                sh '''
docker run --rm \
    -v ${HOST_WORKSPACE}/terraform:/terraform \
    -w /terraform \
    hashicorp/terraform:latest init

docker run --rm \
    -v ${HOST_WORKSPACE}/terraform:/terraform \
    -w /terraform \
    -e TF_VAR_github_pat="${TF_VAR_github_pat}" \
    -e TF_VAR_secret_key="${TF_VAR_secret_key}" \
    -e TF_VAR_db_host="${TF_VAR_db_host}" \
    -e TF_VAR_postgres_db="${TF_VAR_postgres_db}" \
    -e TF_VAR_postgres_user="${TF_VAR_postgres_user}" \
    -e TF_VAR_postgres_password="${TF_VAR_postgres_password}" \
    -e TF_VAR_algorithm="${TF_VAR_algorithm}" \
    -e TF_VAR_access_token_expire_minutes="${TF_VAR_access_token_expire_minutes}" \
    hashicorp/terraform:latest plan
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
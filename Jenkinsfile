pipeline {
    agent any  // Run on any available Jenkins agent

    environment {
        // Path where Terraform files live inside the workspace
        TF_DIR = "terraform"
    }

    stages {

        // ─────────────────────────────────────────
        // STAGE 1: Pull code from Git
        // ─────────────────────────────────────────
        stage('Checkout') {
            steps {
                // Jenkins automatically checks out your repo here
                // because the pipeline is linked to it (configured in Step 5)
                checkout scm
                echo "Code checked out successfully"
            }
        }

        // ─────────────────────────────────────────
        // STAGE 2: Security Scan with Trivy
        // ─────────────────────────────────────────
        stage('Infrastructure Security Scan') {
            steps {
                script {
                    echo "Running Trivy security scan on Terraform files..."

                    // Run Trivy as a Docker container to scan terraform/ folder
                    // --exit-code 1 means: exit with failure if issues found
                    // --severity HIGH,CRITICAL means: only flag serious issues
                    // We use || true so Jenkins captures output even on failure
                    def scanResult = sh(
                        script: """
                            docker run --rm \
                                -v \${WORKSPACE}:/project \
                                aquasec/trivy:latest config \
                                --severity HIGH,CRITICAL \
                                --format table \
                                --exit-code 1 \
                                /project/${TF_DIR} || true
                        """,
                        returnStdout: true
                    ).trim()

                    // Print the full scan output to Jenkins console
                    echo "========== TRIVY SCAN REPORT =========="
                    echo "${scanResult}"
                    echo "========================================"

                    // Check if critical issues were found
                    if (scanResult.contains("CRITICAL") || scanResult.contains("HIGH")) {
                        echo "⚠️  SECURITY ISSUES FOUND — Review the report above."
                        echo "Fix vulnerabilities and re-run the pipeline."
                        // Save report to a file for reference
                        writeFile file: 'trivy-report.txt', text: scanResult
                        error("Pipeline halted: Security vulnerabilities detected.")
                    } else {
                        echo "✅ No critical security issues found. Proceeding..."
                    }
                }
            }
        }

        // ─────────────────────────────────────────
        // STAGE 3: Terraform Plan
        // ─────────────────────────────────────────
        stage('Terraform Plan') {
            steps {
                script {
                    echo "Running Terraform plan..."

                    // Run terraform init + plan inside a terraform Docker container
                    // This avoids needing Terraform installed on Jenkins itself
                    sh """
                        docker run --rm \
                            -v \${WORKSPACE}/${TF_DIR}:/workspace \
                            -w /workspace \
                            hashicorp/terraform:latest \
                            init -input=false
                    """

                    sh """
                        docker run --rm \
                            -v \${WORKSPACE}/${TF_DIR}:/workspace \
                            -w /workspace \
                            hashicorp/terraform:latest \
                            plan -input=false
                    """
                }
            }
        }
    }

    // ─────────────────────────────────────────
    // Post-run actions (always runs)
    // ─────────────────────────────────────────
    post {
        always {
            echo "Pipeline finished."
            // Archive the Trivy report if it exists
            archiveArtifacts artifacts: 'trivy-report.txt', allowEmptyArchive: true
        }
        success {
            echo "✅ Pipeline passed successfully!"
        }
        failure {
            echo "❌ Pipeline failed. Check the scan report above."
        }
    }
}
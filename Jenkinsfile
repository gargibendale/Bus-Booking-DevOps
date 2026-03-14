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
                sh 'ls -la'              // Show root of workspace
        sh 'ls -la terraform/'   // Show terraform folder contents
        echo "Code checked out successfully"
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

    sh """
        docker run --rm \
            -v ${WORKSPACE}:/project \
            aquasec/trivy:latest config \
            --severity HIGH,CRITICAL \
            --format table \
            /project/${TF_DIR} > trivy-report.txt 2>&1 || true
    """

    def scanResult = readFile('trivy-report.txt').trim()

    echo "========== TRIVY SCAN REPORT =========="
    echo "${scanResult}"
    echo "========================================"

    if (scanResult.contains("CRITICAL") || scanResult.contains("HIGH")) {
        echo "⚠️  SECURITY ISSUES FOUND — Review the report above."
        echo "Fix vulnerabilities and re-run the pipeline."
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

            sh """
                docker run --rm \
                -v ${WORKSPACE}:/workspace \
                -w /workspace/terraform \
                hashicorp/terraform:latest init -input=false
            """

            sh """
                docker run --rm \
                -v ${WORKSPACE}:/workspace \
                -w /workspace/terraform \
                hashicorp/terraform:latest plan -input=false
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
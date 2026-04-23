# BusBooking — DevSecOps Deployment

A full-stack bus booking web application deployed to AWS using Docker, Terraform, and a Jenkins CI/CD pipeline with integrated security scanning via Trivy.

---

## Live Application

The application is accessible at: `http://13.53.37.117`

---

## Project Overview

This project demonstrates a complete DevSecOps workflow — from containerizing a multi-service application, to provisioning secure cloud infrastructure with Terraform, to automating deployments through a Jenkins pipeline with AI-assisted security remediation.

The application allows users to browse and book bus tickets. It is composed of three services:
- An **Angular** frontend served via **Nginx**
- A **FastAPI** backend REST API
- A **PostgreSQL** database hosted on **AWS RDS**

---

## Architecture

```
                        ┌────────────────────────────────────────┐
                        │              AWS Cloud (EC2)           │
                        │                                        │
  User ──── HTTPS ────► │  ┌─────────────┐    ┌───────────────┐  │
                        │  │   Frontend  │    │    Backend    │  │
                        │  │  Angular +  │───►│   FastAPI     │  │
                        │  │    Nginx    │    │  (REST API)   │  │
                        │  └─────────────┘    └──────┬────────┘  │
                        │                            │           │
                        └────────────────────────────┼───────────┘
                                                     │
                                              ┌──────▼──────┐
                                              │   AWS RDS   │
                                              │ PostgreSQL  │
                                              └─────────────┘
```

**How it fits together:**
- The frontend (Angular) is served by Nginx inside a Docker container. Nginx acts as both a static file server and a reverse proxy, forwarding API calls to the backend.
- The backend (FastAPI) runs in a separate Docker container, handles business logic, and communicates with the database.
- The PostgreSQL database was migrated to **AWS RDS**, keeping it managed, persistent, and separate from the application containers.
- Both containers (frontend + backend) are orchestrated using **Docker Compose** and deployed onto an **AWS EC2** instance provisioned by Terraform.

---

## Cloud Provider

**Amazon Web Services (AWS)**

| Service | Purpose |
|---|---|
| EC2 | Hosts the Docker containers (frontend + backend) |
| RDS (PostgreSQL) | Managed relational database |
| VPC | Isolated virtual network for all resources |
| Security Groups | Firewall rules controlling inbound/outbound traffic |

---

## Tools & Technologies

### Application
| Tool | Role |
|---|---|
| Angular | Frontend SPA framework |
| Nginx | Serves Angular build + reverse proxy to backend |
| FastAPI (Python) | Backend REST API |
| PostgreSQL | Relational database |

### Containerization
| Tool | Role |
|---|---|
| Docker | Containerizes frontend and backend services |
| Docker Compose | Defines and runs the multi-container application locally and on EC2 |

### Infrastructure as Code
| Tool | Role |
|---|---|
| Terraform | Provisions AWS infrastructure (EC2, RDS, VPC, Security Groups) |

### CI/CD & Security
| Tool | Role |
|---|---|
| Jenkins | Runs the automated CI/CD pipeline (via Docker) |
| Trivy | Scans Terraform files for security misconfigurations |
| AI (Claude) | Analyzed the Trivy vulnerability report and recommended fixes |

---

## Jenkins Pipeline

The pipeline consists of three stages:

```
┌─────────────┐     ┌──────────────────────────┐     ┌─────────────────┐
│  Stage 1    │────►│        Stage 2           │────►│    Stage 3      │
│  Checkout   │     │  Infrastructure Security │     │ Terraform Plan  │
│             │     │  Scan (Trivy)            │     │                 │
└─────────────┘     └──────────────────────────┘     └─────────────────┘
```

1. **Checkout** — Pulls the latest source code from the Git repository.
2. **Infrastructure Security Scan** — Trivy scans all Terraform (`.tf`) files for misconfigurations and known vulnerabilities. The pipeline fails if critical issues are found.
3. **Terraform Plan** — Runs `terraform plan` to preview the infrastructure changes before any deployment.

---

## Security Remediation (AI-Assisted)

The Terraform code was initially written with an **intentional vulnerability**: SSH port 22 open to `0.0.0.0/0`, exposing the EC2 instance to the entire internet.

**Workflow:**
1. The Jenkins pipeline ran and Trivy flagged the vulnerability in the security scan stage.
2. The Trivy report was passed to an AI assistant (Claude) for analysis.
3. The AI explained the risk and recommended restricting the SSH CIDR to a specific trusted IP range.
4. The Terraform code was updated accordingly.
5. The pipeline was re-run — the scan passed with zero critical issues.

### Identified Vulnerabilities & Fixes
 
| ID | Severity | Issue | Fix |
|---|---|---|---|
| AWS-0107 | HIGH | SSH (port 22) open to `0.0.0.0/0` — exposes the instance to brute-force attacks from the entire internet | Restricted SSH ingress CIDR to a trusted `/32` IP address |
| AWS-0104 | CRITICAL | Unrestricted egress — instance can reach any IP on any port, enabling data exfiltration or malware download if compromised | Locked outbound rules to only the specific ports the application needs |
| AWS-0028 | HIGH | IMDSv2 not enforced — without token-based access, code running on the instance (e.g. via an SSRF attack) can freely retrieve IAM credentials from the metadata service | Set `http_tokens = "required"` to enforce IMDSv2 |
| AWS-0131 | HIGH | Root EBS volume unencrypted — data at rest (configs, logs, cached secrets) is readable in plaintext if the underlying disk is ever recovered | Enabled root volume encryption via AWS KMS |
| AWS-0164 | HIGH | Subnet auto-assigns public IPs — every instance launched in the subnet gets a public IP by default, unnecessarily increasing the attack surface | Set `map_public_ip_on_launch = false`; only resources that explicitly need internet exposure are assigned public IPs |

---

## Running Locally

### Prerequisites
- Docker & Docker Compose installed
- AWS credentials configured (for Terraform)
- Terraform installed

### Start the application locally
```bash
docker-compose up --build
```

The frontend will be accessible at `http://localhost` and the backend at `http://localhost:8000`.

### Infrastructure provisioning
```bash
cd terraform/
terraform init
terraform plan
terraform apply
```

---

## Repository Structure

```
.
├── frontend/               # Angular app + Nginx config
│   └── Dockerfile
├── backend/                # FastAPI application
│   └── Dockerfile
├── docker-compose.yml      # Multi-container orchestration
├── terraform/              # AWS infrastructure (final secured version)
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
├── Jenkinsfile             # CI/CD pipeline definition
|── docker-compose.jenkins.yml #custom config for jenkins
|── Dockerfile.jenkins #jenkins container with docker installed.
└── README.md
```

---

## AI Usage Log

**Tool used:** Claude (Anthropic)

**Prompt provided:**
> "You are a senior cloud security engineer. I ran a Trivy infrastructure security scan on my Terraform code (main.tf) and received the following vulnerability report (check attachment).
>
> My main.tf is (check attachment)
>
> Please do the following:
>  1. Explain each vulnerability in simple terms - what is the risk and what could an attacker do if it were exploited?
>  2. Rewrite only the affected blocks in my main.tf to fix each vulnerability, following AWS security best practices.
>  3. Summarize the before vs. after changes in a table format.
>  Ensure the fixed code has zero CRITICAL or HIGH severity issues when re-scanned."

**Outcome:**
- The updated Terraform code passed the Trivy scan with zero critical findings on the re-run of the Jenkins pipeline.

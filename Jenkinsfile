pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timeout(time: 10, unit: 'MINUTES')
    }

    environment {
        PROJECT_NAME       = "Smart-Expense-Splitter"
        TARGET_DIR         = "/var/jenkins_home/projects/${PROJECT_NAME}/${BRANCH_NAME}"
        SONAR_SCANNER_OPTS = "-Xmx512m"
        NODE_OPTIONS       = "--max-old-space-size=384"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Frontend') {
            steps {
                dir('frontend') {
                    sh '''
                        npm ci
                        npm run build
                    '''
                }
            }
        }

        stage('SonarQube Analysis') {
            when {
                branch 'develop'
            }
            steps {
                sh """
                    echo "Starting SonarQube analysis of $PROJECT_NAME"
                    echo "SONAR_SCANNER_OPTS=$SONAR_SCANNER_OPTS"
                    echo "NODE_OPTIONS=$NODE_OPTIONS"
                """
                script {
                    def scannerHome = tool 'sonar-scanner'
                    withSonarQubeEnv('SonarQube') {
                        sh """
                        ${scannerHome}/bin/sonar-scanner \
                          -Dsonar.projectKey=${PROJECT_NAME} \
                          -Dsonar.branch.name=${BRANCH_NAME}
                        """
                    }
                }
            }
        }

        stage('Deploy Frontend') {
            when {
                anyOf {
                    branch 'master'
                    branch 'develop'
                }
            }
            steps {
                sh '''
                    echo "Deploying frontend to $TARGET_DIR"

                    mkdir -p "$TARGET_DIR"
                    rm -rf "$TARGET_DIR"/*

                    cp -r frontend/build/* "$TARGET_DIR"/
                '''
            }
        }
    }

    post {
        always {
            deleteDir()
        }
    }
}
